import app from "./app";
import { env } from "./config/env";
import { connectDB, disconnectDB, isMongoConnected } from "./config/db";
import type { Request, Response } from "express";

declare global {
  // eslint-disable-next-line no-var
  var __serverDbPromise: Promise<void> | undefined;
}

async function ensureDBConnection(): Promise<void> {
  if (isMongoConnected()) {
    return;
  }

  if (!global.__serverDbPromise) {
    global.__serverDbPromise = connectDB()
      .then(() => undefined)
      .catch((error) => {
        global.__serverDbPromise = undefined;
        throw error;
      });
  }

  await global.__serverDbPromise;
}

// Vercel Serverless Function Handler
export default async function handler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    await ensureDBConnection();

    app(req, res);
  } catch (error) {
    console.error("SERVERLESS DATABASE ERROR:", error);

    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        code: "DATABASE_CONNECTION_ERROR",
        message: "Database connection failed. Please try again later.",
      });
    }
  }
}

// Local development server
if (require.main === module) {
  async function main(): Promise<void> {
    await ensureDBConnection();

    const server = app.listen(env.PORT, () => {
      console.log(
        `API running on http://localhost:${env.PORT}/api`
      );
    });

    let shuttingDown = false;

    const shutdown = (signal: string): void => {
      if (shuttingDown) return;

      shuttingDown = true;
      console.log(`${signal} received, shutting down`);

      server.close(async (error) => {
        if (error) {
          console.error("Server shutdown error:", error);
        }

        try {
          await disconnectDB();
          console.log("MongoDB disconnected");
          process.exit(error ? 1 : 0);
        } catch (dbError) {
          console.error("Database shutdown error:", dbError);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  }

  main().catch((error) => {
    console.error("Server startup failed:", error);
    process.exit(1);
  });
}
