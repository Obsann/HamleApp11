import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { UserModel } from "@workspace/db";
import { requireAuth, signToken } from "../middlewares/auth";
import { LoginBody } from "@workspace/api-zod";
import { sendMail } from "../utils/mailer";

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
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      recoveryEmail: user.recoveryEmail,
      role: user.role,
      securityQuestion1: user.securityQuestion1,
      securityQuestion2: user.securityQuestion2
    },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const user = await UserModel.findById(userId);
  if (!user || (user as any).deletedAt) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  res.json({ 
    id: user.id, 
    name: user.name, 
    email: user.email, 
    recoveryEmail: user.recoveryEmail,
    role: user.role,
    securityQuestion1: user.securityQuestion1,
    securityQuestion2: user.securityQuestion2
  });
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

// GET /auth/forgot-password/questions
router.get("/auth/forgot-password/questions", async (req: Request, res: Response) => {
  const email = req.query.email as string;
  if (!email) {
    res.status(400).json({ message: "Email is required." });
    return;
  }

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user || user.deletedAt) {
    res.status(404).json({ message: "No active account found with that email." });
    return;
  }

  if (!user.securityQuestion1 || !user.securityQuestion2) {
    res.status(404).json({ message: "Security questions are not set up for this account. Please contact an administrator." });
    return;
  }

  res.json({
    question1: user.securityQuestion1,
    question2: user.securityQuestion2,
  });
});

// POST /auth/forgot-password
router.post("/auth/forgot-password", async (req: Request, res: Response) => {
  const { email, answer1, answer2 } = req.body;
  
  if (!email || !answer1 || !answer2) {
    res.status(400).json({ message: "Email and both security answers are required." });
    return;
  }

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user || user.deletedAt) {
    res.status(400).json({ message: "Invalid email or incorrect security answers." });
    return;
  }

  if (!user.securityQuestion1 || !user.securityQuestion2 || !user.securityAnswer1 || !user.securityAnswer2) {
    res.status(400).json({ message: "Invalid email or incorrect security answers." });
    return;
  }

  // Very simple case-insensitive matching for answers
  const isAnswer1Correct = answer1.trim().toLowerCase() === user.securityAnswer1.trim().toLowerCase();
  const isAnswer2Correct = answer2.trim().toLowerCase() === user.securityAnswer2.trim().toLowerCase();

  if (!isAnswer1Correct || !isAnswer2Correct) {
    res.status(400).json({ message: "Invalid email or incorrect security answers." });
    return;
  }

  // Generate a random temporary password: 8 characters, a mix of upper, lower, numbers, and one special char
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let tempPassword = "";
  for (let i = 0; i < 7; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  tempPassword += "!"; // Guarantee a special character to pass complexity rules

  // Hash and save
  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(tempPassword, salt);
  await user.save();

  // Email the password
  try {
    await sendMail({
      to: user.recoveryEmail,
      subject: "Your Temporary Password for Hamle SIS",
      text: `Hello ${user.name},\n\nYour password has been reset. Your temporary password is: ${tempPassword}\n\nPlease log in and change your password immediately in your Profile tab.\n\nThank you,\nHamle Elementary School`,
      html: `<p>Hello <strong>${user.name}</strong>,</p>
             <p>Your password has been reset.</p>
             <p>Your temporary password is: <strong>${tempPassword}</strong></p>
             <p>Please log in and change your password immediately in your Profile tab.</p>
             <br/>
             <p>Thank you,<br/>Hamle Elementary School</p>`
    });
    
    res.json({ message: "Email sent with temporary password." });
  } catch (error) {
    console.error("Failed to send reset email:", error);
    res.status(500).json({ message: "Password reset successful, but failed to send email. Please contact support." });
  }
});

export default router;
