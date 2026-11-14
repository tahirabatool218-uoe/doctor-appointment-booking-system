import mongoose from "mongoose";
import { env } from "./env";
import "../models"; // register all models so indexes can be built

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI);
  // Make sure indexes (incl. the unique partial "no double booking" index) exist before serving traffic.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  console.log("MongoDB connected");
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
