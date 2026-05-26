import { Router, type IRouter } from "express";
import { UserModel, StudentModel, AuditLogModel } from "@workspace/db";
import bcrypt from "bcryptjs";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateUserBody, UpdateUserBody } from "@workspace/api-zod";
import { validatePassword } from "./auth";

const router: IRouter = Router();

// GET /users with N+1 fix, pagination, and soft delete check (Admin only)
router.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    // Pagination
    const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
    const limit = Math.max(1, Math.min(1000, parseInt(req.query["limit"] as string) || 100));
    const skip = (page - 1) * limit;

    const roleFilter = req.query["role"] as string | undefined;

    let query: Record<string, unknown> = { 
      role: { $in: ["teacher", "parent"] },
      deletedAt: null // Only fetch active users (soft delete check)
    };
    
    if (roleFilter === "teacher") query["role"] = "teacher";
    else if (roleFilter === "parent") query["role"] = "parent";

    const rows = await UserModel.find(query)
      .sort({ role: 1, name: 1 })
      .skip(skip)
      .limit(limit);

    // Bulk count students to avoid N+1 countDocuments queries
    const userIds = rows.map((r) => r._id);
    
    const teacherCounts = await StudentModel.aggregate([
      { $match: { teacherId: { $in: userIds } } },
      { $group: { _id: "$teacherId", count: { $sum: 1 } } }
    ]);
    
    const parentCounts = await StudentModel.aggregate([
      { $match: { parentId: { $in: userIds } } },
      { $group: { _id: "$parentId", count: { $sum: 1 } } }
    ]);

    const countMap = new Map<string, number>();
    teacherCounts.forEach((t) => countMap.set(t._id.toString(), t.count));
    parentCounts.forEach((p) => countMap.set(p._id.toString(), p.count));

    const detailed = rows.map((user) => ({
      id: user.id ?? user._id?.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      studentCount: countMap.get(user._id.toString()) ?? 0,
    }));

    res.json(detailed);
  }
);

// POST /users - Create a user with password complexity check (Admin only)
router.post(
  "/users",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    try {
      const parsed = CreateUserBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Validation failed: check name, email, password, and role.", errors: parsed.error.flatten() });
        return;
      }
      const { name, email, password, role } = parsed.data;

      // Password Complexity Validation
      const passwordErr = validatePassword(password);
      if (passwordErr) {
        res.status(400).json({ message: passwordErr });
        return;
      }

      // Check if user exists (including soft-deleted ones)
      const existing = await UserModel.findOne({ email: email.toLowerCase() });
      if (existing) {
        if ((existing as any).deletedAt) {
          // Reactivate the user instead of duplicating!
          existing.name = name;
          (existing as any).deletedAt = null;
          existing.passwordHash = await bcrypt.hash(password, 10);
          existing.role = role;
          await existing.save();

          // Create Audit Log
          await AuditLogModel.create({
            userId: req.user!.userId,
            userEmail: req.user!.email,
            action: "reactivate_user",
            entity: "User",
            entityId: existing.id,
            details: `Reactivated soft-deleted ${role} user ${name} (${email.toLowerCase()})`,
          });

          res.status(201).json({
            id: existing.id,
            name: existing.name,
            email: existing.email,
            role: existing.role,
            studentCount: 0,
          });
          return;
        }

        res.status(409).json({ message: "A user with this email already exists." });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await UserModel.create({ name, email: email.toLowerCase(), passwordHash, role });

      // Create Audit Log
      await AuditLogModel.create({
        userId: req.user!.userId,
        userEmail: req.user!.email,
        action: "create_user",
        entity: "User",
        entityId: user.id,
        details: `Created new ${role} user ${name} (${email.toLowerCase()})`,
      });

      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentCount: 0,
      });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create user", error: err.message });
    }
  }
);

// GET /users/:id - Get a single user (Admin only)
router.get(
  "/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
    const user = await UserModel.findOne({ _id: rawId, deletedAt: null });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const studentCount = await StudentModel.countDocuments(
      user.role === "teacher" ? { teacherId: user._id } : { parentId: user._id }
    );

    res.json({
      id: user.id ?? user._id?.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      studentCount,
    });
  }
);

// PUT /users/:id - Update user (Admin only)
router.put(
  "/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    try {
      const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
      const parsed = UpdateUserBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Validation failed: check name, email, and role." });
        return;
      }

      const existing = await UserModel.findOne({ _id: rawId, deletedAt: null });
      if (!existing) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const emailConflict = await UserModel.findOne({
        email: parsed.data.email.toLowerCase(),
        _id: { $ne: rawId },
        deletedAt: null
      });
      if (emailConflict) {
        res.status(409).json({ message: "Email already in use by another user." });
        return;
      }

      const updateFields: Record<string, unknown> = {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
      };

      if (parsed.data.password) {
        const passwordErr = validatePassword(parsed.data.password);
        if (passwordErr) {
          res.status(400).json({ message: passwordErr });
          return;
        }
        updateFields["passwordHash"] = await bcrypt.hash(parsed.data.password, 10);
      }

      const updated = await UserModel.findByIdAndUpdate(rawId, updateFields, { new: true });
      if (!updated) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // Create Audit Log
      await AuditLogModel.create({
        userId: req.user!.userId,
        userEmail: req.user!.email,
        action: "update_user",
        entity: "User",
        entityId: updated.id,
        details: `Updated ${updated.role} user ${updated.name} (${updated.email})`,
      });

      const studentCount = await StudentModel.countDocuments(
        updated.role === "teacher" ? { teacherId: updated._id } : { parentId: updated._id }
      );

      res.json({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        studentCount,
      });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update user", error: err.message });
    }
  }
);

// DELETE /users/:id - Soft delete user and unassign from students (Admin only)
router.delete(
  "/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    try {
      const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];

      if (rawId === req.user!.userId) {
        res.status(403).json({ message: "You cannot delete your own account." });
        return;
      }

      const user = await UserModel.findOne({ _id: rawId, deletedAt: null });
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // Perform Soft Delete
      user.deletedAt = new Date();
      await user.save();

      // Cascade Cleanups: unassign this user from any students
      if (user.role === "parent") {
        await StudentModel.updateMany({ parentId: rawId }, { parentId: null });
      } else if (user.role === "teacher") {
        await StudentModel.updateMany({ teacherId: rawId }, { teacherId: null });
      }

      // Create Audit Log
      await AuditLogModel.create({
        userId: req.user!.userId,
        userEmail: req.user!.email,
        action: "delete_user",
        entity: "User",
        entityId: rawId,
        details: `Soft-deleted ${user.role} user ${user.name} (${user.email}) and unassigned them from any students.`,
      });

      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete user", error: err.message });
    }
  }
);

export default router;
