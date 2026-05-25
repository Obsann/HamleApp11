import mongoose from "mongoose";

const MONGODB_URI = process.env["MONGODB_URI"];

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI must be set. Please provide a MongoDB connection string.");
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI!);
}

export * from "./models/index.js";
