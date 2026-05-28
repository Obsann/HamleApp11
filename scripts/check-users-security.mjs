import mongoose from "mongoose";

const uri = "mongodb+srv://HamleApp:5ehRkKrL1WBxmFZW@mernapp.bpbhluf.mongodb.net/HamleApp?retryWrites=true&w=majority";

try {
  await mongoose.connect(uri);
  const users = await mongoose.connection.db.collection("users").find({}).toArray();
  
  console.log("=== USER SECURITY QUESTIONS ===");
  for (const user of users) {
    console.log(`👤 ${user.name} (${user.email}) - Role: ${user.role} - Recovery: ${user.recoveryEmail}`);
    console.log(`   Q1: ${user.securityQuestion1}`);
    console.log(`   A1: ${user.securityAnswer1}`);
    console.log(`   Q2: ${user.securityQuestion2}`);
    console.log(`   A2: ${user.securityAnswer2}`);
    console.log("------------------------");
  }
} catch (err) {
  console.error("Error:", err);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}
