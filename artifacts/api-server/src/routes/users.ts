import { Router, type IRouter } from "express";
import { db, usersTable, studentsTable } from "@workspace/db";
import { eq, or, and, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateUserBody, UpdateUserBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function buildUserDetail(user: typeof usersTable.$inferSelect) {
  const [res] = await db
    .select({ cnt: count() })
    .from(studentsTable)
    .where(
      user.role === "teacher"
        ? eq(studentsTable.teacherId, user.id)
        : eq(studentsTable.parentId, user.id)
    );
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentCount: Number(res?.cnt ?? 0),
  };
}

router.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const roleFilter = req.query["role"] as string | undefined;

    let rows;
    if (roleFilter === "teacher") {
      rows = await db.select().from(usersTable).where(eq(usersTable.role, "teacher")).orderBy(usersTable.name);
    } else if (roleFilter === "parent") {
      rows = await db.select().from(usersTable).where(eq(usersTable.role, "parent")).orderBy(usersTable.name);
    } else {
      rows = await db
        .select()
        .from(usersTable)
        .where(or(eq(usersTable.role, "teacher"), eq(usersTable.role, "parent")))
        .orderBy(usersTable.role, usersTable.name);
    }

    const detailed = await Promise.all(rows.map(buildUserDetail));
    res.json(detailed);
  }
);

router.post(
  "/users",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const parsed = CreateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Validation failed: check name, email, password, and role." });
      return;
    }
    const { name, email, password, role } = parsed.data;

    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      res.status(409).json({ message: "A user with this email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({ name, email, passwordHash, role }).returning();

    const detail = await buildUserDetail(user);
    res.status(201).json(detail);
  }
);

router.get(
  "/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, rawId));
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
    const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
    const parsed = UpdateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Validation failed: check name, email, and role." });
      return;
    }

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, rawId));
    if (!existing) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const emailConflict = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, parsed.data.email));
    if (emailConflict.length > 0 && emailConflict[0].id !== rawId) {
      res.status(409).json({ message: "Email already in use by another user." });
      return;
    }

    const updateFields: Partial<typeof usersTable.$inferInsert> = {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
    };
    if (parsed.data.password) {
      updateFields.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }

    const [updated] = await db.update(usersTable).set(updateFields).where(eq(usersTable.id, rawId)).returning();
    const detail = await buildUserDetail(updated);
    res.json(detail);
  }
);

router.delete(
  "/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];

    if (rawId === req.user!.userId) {
      res.status(403).json({ message: "You cannot delete your own account." });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, rawId));
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    await db.delete(usersTable).where(eq(usersTable.id, rawId));
    res.status(204).send();
  }
);

export default router;
