const { MongoClient } = require('mongodb');

// Try connecting to the primary shard directly
const primaryUri = "mongodb://kshitijk146_db_user:vmW2XMei72g6uKV4@ac-0hebxtd-shard-00-02.xiyzzkj.mongodb.net:27017/memoria_ai?ssl=true&authSource=admin&appName=Cluster1";

async function run() {
  const client = new MongoClient(primaryUri, {
    connectTimeoutMS: 5000,
    socketTimeoutMS: 5000
  });
  try {
    console.log("Connecting directly to primary shard...");
    await client.connect();
    console.log("Connected successfully!");
    const db = client.db("memoria_ai");
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await client.close();
  }
}

run();
