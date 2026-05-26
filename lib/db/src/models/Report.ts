import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IReport extends Document {
  studentId: Types.ObjectId;
  teacherId: Types.ObjectId;
  subject: string;
  score: number | null;
  midExam?: number | null;
  tests?: number | null;
  continuousAssessment?: number | null;
  finalExam?: number | null;
  type: "grade" | "assessment" | "attendance";
  date: string;
  notes: string | null;
  term: string | null;
  status?: "Pass" | "Fail" | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true },
    score: { 
      type: Number, 
      default: null,
      min: [0, "Score cannot be less than 0"],
      max: [100, "Score cannot be greater than 100"]
    },
    midExam: { type: Number, default: 0, min: 0, max: 100 },
    tests: { type: Number, default: 0, min: 0, max: 100 },
    continuousAssessment: { type: Number, default: 0, min: 0, max: 100 },
    finalExam: { type: Number, default: 0, min: 0, max: 100 },
    type: {
      type: String,
      enum: ["grade", "assessment", "attendance"],
      required: true,
      index: true,
    },
    date: { type: String, required: true, index: true },
    notes: { type: String, default: null },
    term: { type: String, default: null },
    status: { type: String, enum: ["Pass", "Fail"], default: null },
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

ReportSchema.pre<IReport>("save", function (next) {
  if (this.type === "grade") {
    const mid = this.midExam || 0;
    const tests = this.tests || 0;
    const ca = this.continuousAssessment || 0;
    const final = this.finalExam || 0;
    
    this.score = mid + tests + ca + final;
    this.status = this.score >= 50 ? "Pass" : "Fail";
  } else if (this.score !== null && this.score !== undefined) {
    this.status = this.score >= 50 ? "Pass" : "Fail";
  }
  next();
});

export const ReportModel = mongoose.model<IReport>("Report", ReportSchema);

