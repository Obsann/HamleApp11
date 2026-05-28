import mongoose from "mongoose";

const uri = "mongodb+srv://HamleApp:5ehRkKrL1WBxmFZW@mernapp.bpbhluf.mongodb.net/HamleApp?retryWrites=true&w=majority";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
    
    const user = await mongoose.connection.db.collection("users").findOne({ email: "teacher@hamle.edu" });
    if (!user) {
      console.log("User not found");
      return;
    }
    
    console.log("Found user:", user.name, "ID:", user._id);
    
    // Attempt to update security questions
    const updateFields = {
      securityQuestion1: "What is your favorite color?",
      securityAnswer1: "blue",
      securityQuestion2: "What is your first pet's name?",
      securityAnswer2: "buddy"
    };
    
    const result = await mongoose.connection.db.collection("users").updateOne(
      { _id: user._id },
      { $set: updateFields }
    );
    
    console.log("Update result:", result);
    
    const updatedUser = await mongoose.connection.db.collection("users").findOne({ _id: user._id });
    console.log("Updated user security questions:", {
      q1: updatedUser.securityQuestion1,
      a1: updatedUser.securityAnswer1,
      q2: updatedUser.securityQuestion2,
      a2: updatedUser.securityAnswer2
    });
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
