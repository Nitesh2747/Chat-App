import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

export async function connectDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Indexes (like the unique username) are built in the background; wait until they exist
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

export async function clearDb() {
  const { collections } = mongoose.connection;
  for (const name in collections) await collections[name].deleteMany({});
}

export async function disconnectDb() {
  await mongoose.disconnect();
  await mongod.stop();
}