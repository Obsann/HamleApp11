import mongoose, { Schema, type Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  recoveryEmail: string;
  passwordHash: string;
  role: "admin" | "teacher" | "parent";
  securityQuestion1?: string | null;
  securityAnswer1?: string | null;
  securityQuestion2?: string | null;
  securityAnswer2?: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    recoveryEmail: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "teacher", "parent"],
      default: "parent",
      required: true,
    },
    securityQuestion1: { type: String, default: null },
    securityAnswer1: { type: String, default: null },
    securityQuestion2: { type: String, default: null },
    securityAnswer2: { type: String, default: null },
    deletedAt: { type: Date, default: null },
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

export const UserModel = mongoose.model<IUser>("User", UserSchema);
