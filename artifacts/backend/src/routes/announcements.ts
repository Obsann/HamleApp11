import { Router, type IRouter } from "express";
import { AnnouncementModel, UserModel, AuditLogModel } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

function formatAnnouncementResponse(ann: any) {
  const author = ann.authorId;
  const authorName = author && typeof author === "object" && "name" in author 
    ? (author as any).name 
    : "Admin";
  
  const authorIdStr = author && typeof author === "object" && "_id" in author 
    ? (author as any)._id.toString() 
    : author?.toString() ?? null;

  return {
    id: ann.id ?? ann._id?.toString(),
    title: ann.title,
    content: ann.content,
    targetRole: ann.targetRole,
    authorId: authorIdStr,
    authorName,
    createdAt: ann.createdAt,
    updatedAt: ann.updatedAt,
  };
}

// GET /announcements - Retrieve announcements based on role
router.get("/announcements", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  
  // Pagination
  const page = Math.max(1, parseInt(req.query["page"] as string) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query["limit"] as string) || 20));
  const skip = (page - 1) * limit;

  let query: Record<string, unknown> = {};

  if (user.role === "admin") {
    // Admin gets all announcements
  } else if (user.role === "teacher") {
    query = { targetRole: { $in: ["all", "teacher"] } };
  } else {
    query = { targetRole: { $in: ["all", "parent"] } };
  }

  const announcements = await AnnouncementModel.find(query)
    .populate("authorId", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const enriched = announcements.map(formatAnnouncementResponse);
  res.json(enriched);
});

// POST /announcements - Create a new announcement (Admin only)
router.post(
  "/announcements",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    try {
      const { title, content, targetRole } = req.body;

      if (!title?.trim() || !content?.trim()) {
        res.status(400).json({ message: "Title and content are required." });
        return;
      }

      if (targetRole && !["all", "teacher", "parent"].includes(targetRole)) {
        res.status(400).json({ message: "Invalid targetRole. Must be 'all', 'teacher', or 'parent'." });
        return;
      }

      const announcement = await AnnouncementModel.create({
        title: title.trim(),
        content: content.trim(),
        targetRole: targetRole || "all",
        authorId: req.user!.userId,
      });

      const populated = await AnnouncementModel.findById(announcement._id)
        .populate("authorId", "name");

      // Create Audit Log
      await AuditLogModel.create({
        userId: req.user!.userId,
        userEmail: req.user!.email,
        action: "create_announcement",
        entity: "Announcement",
        entityId: announcement.id,
        details: `Created school announcement: "${announcement.title}" for ${announcement.targetRole}`,
      });

      res.status(201).json(formatAnnouncementResponse(populated));
    } catch (err: any) {
      res.status(500).json({ message: "Failed to create announcement", error: err.message });
    }
  }
);

// PUT /announcements/:id - Update an announcement (Admin only)
router.put(
  "/announcements/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    try {
      const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
      const announcement = await AnnouncementModel.findById(rawId);

      if (!announcement) {
        res.status(404).json({ message: "Announcement not found." });
        return;
      }

      const { title, content, targetRole } = req.body;

      if (title !== undefined) announcement.title = title.trim();
      if (content !== undefined) announcement.content = content.trim();
      if (targetRole !== undefined) {
        if (!["all", "teacher", "parent"].includes(targetRole)) {
          res.status(400).json({ message: "Invalid targetRole. Must be 'all', 'teacher', or 'parent'." });
          return;
        }
        announcement.targetRole = targetRole;
      }

      await announcement.save();

      const populated = await AnnouncementModel.findById(announcement._id)
        .populate("authorId", "name");

      // Create Audit Log
      await AuditLogModel.create({
        userId: req.user!.userId,
        userEmail: req.user!.email,
        action: "update_announcement",
        entity: "Announcement",
        entityId: announcement.id,
        details: `Updated announcement ID ${announcement.id}: "${announcement.title}"`,
      });

      res.json(formatAnnouncementResponse(populated));
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update announcement", error: err.message });
    }
  }
);

// DELETE /announcements/:id - Delete an announcement (Admin only)
router.delete(
  "/announcements/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res): Promise<void> => {
    try {
      const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
      const announcement = await AnnouncementModel.findById(rawId);

      if (!announcement) {
        res.status(404).json({ message: "Announcement not found." });
        return;
      }

      await AnnouncementModel.findByIdAndDelete(rawId);

      // Create Audit Log
      await AuditLogModel.create({
        userId: req.user!.userId,
        userEmail: req.user!.email,
        action: "delete_announcement",
        entity: "Announcement",
        entityId: rawId,
        details: `Deleted announcement: "${announcement.title}"`,
      });

      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete announcement", error: err.message });
    }
  }
);

export default router;
