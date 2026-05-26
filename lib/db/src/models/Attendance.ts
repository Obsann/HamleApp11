import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IAttendance extends Document {
  studentId: Types.ObjectId;
  teacherId: Types.ObjectId;
  date: string;
  status: "present" | "absent" | "late";
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["present", "absent", "late"],
      required: true,
      index: true,
    },
    notes: { type: String, default: null },
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

export const AttendanceModel = mongoose.model<IAttendance>(
  "Attendance",
  AttendanceSchema
);
