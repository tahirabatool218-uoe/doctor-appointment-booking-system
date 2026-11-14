import mongoose from "mongoose";
import { env } from "./env";
import "../models";

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConnectionPromise: Promise<mongoose.Mongoose> | undefined;
}

let connectionPromise: Promise<mongoose.Mongoose> | null =
  globalThis.__mongooseConnectionPromise ?? null;

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);

  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (mongoose.connection.readyState === 0) {
    connectionPromise = null;
    globalThis.__mongooseConnectionPromise = undefined;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      })
      .then(async (conn: mongoose.Mongoose) => {
        await Promise.all(
          Object.values(mongoose.models).map((model) => model.init())
        );
        console.log("MongoDB connected successfully");
        return conn;
      })
      .catch((error: unknown) => {
        connectionPromise = null;
        globalThis.__mongooseConnectionPromise = undefined;
        console.error("MongoDB connection failed:", error);
        throw error;
      });

    globalThis.__mongooseConnectionPromise = connectionPromise;
  }

  await connectionPromise;
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  connectionPromise = null;
  globalThis.__mongooseConnectionPromise = undefined;
  await mongoose.disconnect();
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
