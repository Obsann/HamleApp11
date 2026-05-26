import mongoose from "mongoose";

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    throw new Error("MONGODB_URI must be set. Please provide a MongoDB connection string.");
  }
  await mongoose.connect(uri);
}

export * from "./models/index.js";
export { default as mongoose } from "mongoose";
