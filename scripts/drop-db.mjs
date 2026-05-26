import mongoose from "mongoose";

const uri = "mongodb+srv://HamleApp:5ehRkKrL1WBxmFZW@mernapp.bpbhluf.mongodb.net/HamleApp?retryWrites=true&w=majority";

try {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB Atlas");
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const collection of collections) {
    console.log(`Clearing collection: ${collection.name}`);
    await mongoose.connection.db.collection(collection.name).deleteMany({});
  }
  console.log("All collections cleared successfully!");
} catch (err) {
  console.error("Error:", err);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}
