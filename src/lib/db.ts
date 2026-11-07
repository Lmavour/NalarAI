import "server-only";
import mongoose from "mongoose";
import { getMongoConfig } from "@/lib/env";

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = globalThis as typeof globalThis & {
  __nalarMongoose?: MongooseCache;
};

const cache = globalWithMongoose.__nalarMongoose ?? { connection: null, promise: null };
globalWithMongoose.__nalarMongoose = cache;

export async function connectToDatabase() {
  if (cache.connection) return cache.connection;

  if (!cache.promise) {
    const { uri, dbName } = getMongoConfig();
    cache.promise = mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 8_000,
      maxPoolSize: 10,
      minPoolSize: 0,
      autoIndex: process.env.NODE_ENV !== "production",
      bufferCommands: false,
    });
  }

  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
}
