import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IStudent extends Document {
  firstName: string;
  lastName: string;
  grade: string;
  dateOfBirth: string;
  parentId: Types.ObjectId | null;
  teacherId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    grade: { type: String, required: true },
    dateOfBirth: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", default: null },
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

export const StudentModel = mongoose.model<IStudent>("Student", StudentSchema);
