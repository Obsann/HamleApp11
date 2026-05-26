import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IAuditLog extends Document {
  userId: Types.ObjectId | null;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    userEmail: { type: String, default: null, index: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, default: null, index: true },
    details: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

export const AuditLogModel = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
