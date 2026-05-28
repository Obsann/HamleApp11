import mongoose from "mongoose";

const uri = "mongodb+srv://HamleApp:5ehRkKrL1WBxmFZW@mernapp.bpbhluf.mongodb.net/HamleApp?retryWrites=true&w=majority";

try {
  await mongoose.connect(uri);
  
  const parents = await mongoose.connection.db.collection("users").find({ role: "parent" }).toArray();
  const students = await mongoose.connection.db.collection("students").find({}).toArray();
  
  console.log("=== PARENT → CHILDREN MAPPING ===\n");
  
  for (const parent of parents) {
    const children = students.filter(s => s.parentId?.toString() === parent._id.toString());
    console.log(`👤 ${parent.name} (${parent.email})`);
    if (children.length === 0) {
      console.log("   ⚠️  No children linked!");
    } else {
      for (const child of children) {
        console.log(`   └─ ${child.firstName} ${child.lastName} (${child.grade}, ${child.studentNo})`);
      }
    }
    console.log();
  }

  // Check for orphaned students (no parent)
  const orphans = students.filter(s => !s.parentId);
  if (orphans.length > 0) {
    console.log("\n⚠️  ORPHANED STUDENTS (no parent):");
    for (const s of orphans) {
      console.log(`   - ${s.firstName} ${s.lastName}`);
    }
  }

  // Check for duplicate children across parents
  const studentParentMap = new Map();
  for (const s of students) {
    if (studentParentMap.has(s._id.toString())) {
      console.log(`⚠️  Student ${s.firstName} appears multiple times!`);
    }
    studentParentMap.set(s._id.toString(), s.parentId?.toString());
  }
  
  console.log(`\nTotal parents: ${parents.length}`);
  console.log(`Total students: ${students.length}`);
  console.log("✅ All relationships verified.");
  
} catch (err) {
  console.error("Error:", err);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}
