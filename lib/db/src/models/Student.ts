import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IStudent extends Document {
  firstName: string;
  lastName: string;
  grade: string;
  dateOfBirth: string;
  parentId: Types.ObjectId | null;
  teacherId: Types.ObjectId | null;
  studentNo: string;
  gender: "male" | "female";
  address?: {
    region: string;
    zone: string;
    kebele: string;
    houseNo: string;
  } | null;
  faydaId?: string | null;
  enrollmentStatus: "active" | "inactive" | "withdrawn" | "transferred" | "graduated";
  medicalInfo?: string | null;
  emergencyContact?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    grade: { type: String, required: true, index: true },
    dateOfBirth: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    studentNo: { type: String, required: true, unique: true, index: true },
    gender: { type: String, enum: ["male", "female"], default: "male" },
    address: {
      region: { type: String, default: "" },
      zone: { type: String, default: "" },
      kebele: { type: String, default: "" },
      houseNo: { type: String, default: "" },
    },
    faydaId: { type: String, unique: true, sparse: true, default: null, index: true },
    enrollmentStatus: {
      type: String,
      enum: ["active", "inactive", "withdrawn", "transferred", "graduated"],
      default: "active",
      index: true,
    },
    medicalInfo: { type: String, default: null },
    emergencyContact: { type: String, default: null },
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

export const StudentModel = mongoose.model<IStudent>("Student", StudentSchema);

