
import mongoose from "mongoose";
import { env } from "./env";
import "../models";

let connectionPromise: Promise<typeof mongoose> | null = null;

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);

  // Reuse an existing connection.
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // Reset a stale promise if the connection was disconnected.
  if (mongoose.connection.readyState === 0) {
    connectionPromise = null;
  }

  // Create only one connection attempt for concurrent requests.
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
      })
      .then(async (connection) => {
        // Initialize model indexes once per connection.
        await Promise.all(
          Object.values(mongoose.models).map((model) => model.init())
        );

        console.log("MongoDB connected successfully");
        return connection;
      })
      .catch((error) => {
        connectionPromise = null;
        console.error("MongoDB connection failed:", error);
        throw error;
      });
  }

  await connectionPromise;
}

export async function disconnectDB(): Promise<void> {
  connectionPromise = null;
  await mongoose.disconnect();
}
