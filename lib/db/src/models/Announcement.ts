import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  targetRole: "all" | "teacher" | "parent";
  authorId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    targetRole: {
      type: String,
      enum: ["all", "teacher", "parent"],
      default: "all",
      required: true,
      index: true,
    },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

export const AnnouncementModel = mongoose.model<IAnnouncement>(
  "Announcement",
  AnnouncementSchema
);
