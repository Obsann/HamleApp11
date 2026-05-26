import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { UserModel } from "@workspace/db";
import { requireAuth, signToken } from "../middlewares/auth";
import { LoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

// Rate limiter for login endpoint to protect against brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again after 15 minutes." },
});

// Helper for password complexity validation
export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must contain at least one special character.";
  }
  return null;
}

router.post("/auth/login", loginLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const { email, password } = parsed.data;
  const user = await UserModel.findOne({ email });

  if (!user) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  // Check if account is locked or soft-deleted
  if ((user as any).deletedAt) {
    res.status(401).json({ message: "Your account has been deactivated." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role as "admin" | "teacher" | "parent",
  });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const user = await UserModel.findById(userId);
  if (!user || (user as any).deletedAt) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: "Current password and new password are required." });
    return;
  }

  const userId = req.user!.userId;
  const user = await UserModel.findById(userId);
  if (!user || (user as any).deletedAt) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ message: "Incorrect current password." });
    return;
  }

  const passwordErr = validatePassword(newPassword);
  if (passwordErr) {
    res.status(400).json({ message: passwordErr });
    return;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: "Password updated successfully." });
});

export default router;
