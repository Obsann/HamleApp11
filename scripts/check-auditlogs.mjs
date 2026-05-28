import mongoose from "mongoose";

const uri = "mongodb+srv://HamleApp:5ehRkKrL1WBxmFZW@mernapp.bpbhluf.mongodb.net/HamleApp?retryWrites=true&w=majority";

try {
  await mongoose.connect(uri);
  const logs = await mongoose.connection.db.collection("auditlogs").find({}).sort({ createdAt: -1 }).toArray();
  
  console.log("=== AUDIT LOGS IN DATABASE ===");
  console.log(`Total logs: ${logs.length}`);
  for (const log of logs) {
    console.log(`[${log.createdAt}] User: ${log.userEmail} - Action: ${log.action}`);
    console.log(`Details: ${log.details}`);
    console.log("------------------------");
  }
} catch (err) {
  console.error("Error:", err);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}
