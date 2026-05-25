import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IReport extends Document {
  studentId: Types.ObjectId;
  teacherId: Types.ObjectId;
  subject: string;
  score: number | null;
  type: "grade" | "assessment" | "attendance";
  date: string;
  notes: string | null;
  term: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    score: { type: Number, default: null },
    type: {
      type: String,
      enum: ["grade", "assessment", "attendance"],
      required: true,
    },
    date: { type: String, required: true },
    notes: { type: String, default: null },
    term: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ReportModel = mongoose.model<IReport>("Report", ReportSchema);
