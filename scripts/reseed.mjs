import mongoose from "mongoose";

const uri = "mongodb+srv://HamleApp:5ehRkKrL1WBxmFZW@mernapp.bpbhluf.mongodb.net/HamleApp?retryWrites=true&w=majority";

try {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB Atlas");

  // Check if we already have users (seed already ran)
  const usersCount = await mongoose.connection.db.collection("users").countDocuments();
  if (usersCount > 0) {
    console.log(`DB already has ${usersCount} users — seed ran successfully on backend restart.`);
    console.log("If you need a full re-seed, first run: node scripts/drop-db.mjs");
  } else {
    console.log("DB is empty — seed will run on next backend restart.");
    console.log("Please restart the backend: pnpm --filter @workspace/backend dev");
  }

  // Show a sample report to verify scores
  const sampleReport = await mongoose.connection.db.collection("reports").findOne({ type: "grade" });
  if (sampleReport) {
    console.log("\n--- Sample Grade Report ---");
    console.log(`Subject: ${sampleReport.subject}`);
    console.log(`Mid: ${sampleReport.midExam}, Tests: ${sampleReport.tests}, CA: ${sampleReport.continuousAssessment}, Final: ${sampleReport.finalExam}`);
    console.log(`Score: ${sampleReport.score}`);
    console.log(`Expected: ${(sampleReport.midExam || 0) + (sampleReport.tests || 0) + (sampleReport.continuousAssessment || 0) + (sampleReport.finalExam || 0)}`);
    console.log(`Status: ${sampleReport.status}`);
    console.log(`Match: ${sampleReport.score === (sampleReport.midExam || 0) + (sampleReport.tests || 0) + (sampleReport.continuousAssessment || 0) + (sampleReport.finalExam || 0) ? "✅ YES" : "❌ NO"}`);
  } else {
    console.log("\nNo reports found yet — waiting for backend restart to seed.");
  }

} catch (err) {
  console.error("Error:", err);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}
