import { Router, type IRouter } from "express";
import { UserModel, StudentModel } from "@workspace/db";
import bcrypt from "bcryptjs";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateUserBody, UpdateUserBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function buildUserDetail(user: any) {
  const studentCount = await StudentModel.countDocuments(
    user.role === "teacher"
      ? { teacherId: user._id ?? user.id }
      : { parentId: user._id ?? user.id }
  );
  return {
    id: user.id ?? user._id?.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    studentCount,
  };
}

router.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const roleFilter = req.query["role"] as string | undefined;

    let query: Record<string, unknown> = { role: { $in: ["teacher", "parent"] } };
    if (roleFilter === "teacher") query = { role: "teacher" };
    else if (roleFilter === "parent") query = { role: "parent" };

    const rows = await UserModel.find(query).sort({ role: 1, name: 1 });
    const detailed = await Promise.all(rows.map(buildUserDetail));
    res.json(detailed);
  }
);

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

      const existing = await UserModel.findOne({ email: email.toLowerCase() });
      if (existing) {
        res.status(409).json({ message: "A user with this email already exists." });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await UserModel.create({ name, email: email.toLowerCase(), passwordHash, role });
      const detail = await buildUserDetail(user);
      res.status(201).json(detail);
    } catch (err) {
      res.status(500).json({ message: "Failed to create user" });
    }
  }
);

router.get(
  "/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const rawId =
      Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
    const user = await UserModel.findById(rawId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const detail = await buildUserDetail(user);
    res.json(detail);
  }
);

router.put(
  "/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const rawId =
      Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
    const parsed = UpdateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ message: "Validation failed: check name, email, and role." });
      return;
    }

    const existing = await UserModel.findById(rawId);
    if (!existing) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const emailConflict = await UserModel.findOne({
      email: parsed.data.email,
      _id: { $ne: rawId },
    });
    if (emailConflict) {
      res.status(409).json({ message: "Email already in use by another user." });
      return;
    }

    const updateFields: Record<string, unknown> = {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
    };
    if (parsed.data.password) {
      updateFields["passwordHash"] = await bcrypt.hash(parsed.data.password, 10);
    }

    const updated = await UserModel.findByIdAndUpdate(rawId, updateFields, {
      new: true,
    });
    const detail = await buildUserDetail(updated);
    res.json(detail);
  }
);

router.delete(
  "/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const rawId =
      Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];

    if (rawId === req.user!.userId) {
      res
        .status(403)
        .json({ message: "You cannot delete your own account." });
      return;
    }

    const user = await UserModel.findById(rawId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    await UserModel.findByIdAndDelete(rawId);
    res.status(204).send();
  }
);

export default router;
