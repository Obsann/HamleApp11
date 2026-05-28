import mongoose from "mongoose";

const uri = "mongodb+srv://HamleApp:5ehRkKrL1WBxmFZW@mernapp.bpbhluf.mongodb.net/HamleApp?retryWrites=true&w=majority";

try {
  await mongoose.connect(uri);
  const announcements = await mongoose.connection.db.collection("announcements").find({}).toArray();
  
  console.log("=== ANNOUNCEMENTS IN DATABASE ===");
  console.log(`Total announcements: ${announcements.length}`);
  for (const ann of announcements) {
    console.log(`Title: ${ann.title}`);
    console.log(`Content: ${ann.content}`);
    console.log(`Target: ${ann.targetRole}`);
    console.log(`Created At: ${ann.createdAt}`);
    console.log("------------------------");
  }
} catch (err) {
  console.error("Error:", err);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}
