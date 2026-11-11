import "server-only";
import mongoose from "mongoose";
import { resolveDatabaseConnection, type DatabaseConnectionCache } from "@/lib/db-connection";
import { getMongoConfig } from "@/lib/env";

type MongooseCache = DatabaseConnectionCache<typeof mongoose>;

const globalWithMongoose = globalThis as typeof globalThis & {
  __nalarMongoose?: MongooseCache;
};

const cache = globalWithMongoose.__nalarMongoose ?? { connection: null, promise: null };
globalWithMongoose.__nalarMongoose = cache;

export async function connectToDatabase() {
  return resolveDatabaseConnection(cache, {
    isConnected: (connection) => connection.connection.readyState === 1,
    async reset() {
      // Force-close marks Mongoose collections unusable even after the socket reconnects.
      if (mongoose.connection.readyState !== 1) await mongoose.connection.close();
    },
    async connect() {
      if (mongoose.connection.readyState === 1) return mongoose;
      const { uri, dbName } = getMongoConfig();
      return mongoose.connect(uri, {
        dbName,
        serverSelectionTimeoutMS: 20_000,
        connectTimeoutMS: 15_000,
        socketTimeoutMS: 30_000,
        heartbeatFrequencyMS: 5_000,
        maxPoolSize: 10,
        minPoolSize: 0,
        autoIndex: process.env.NODE_ENV !== "production",
        bufferCommands: false,
      });
    },
    report: (details) => console.warn("Database connection attempt failed:", details),
  });
}
