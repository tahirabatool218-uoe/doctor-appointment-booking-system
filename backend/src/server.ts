import app from "./app";
import { env } from "./config/env";
import { connectDB, disconnectDB } from "./config/db";

export default async function handler(req: any, res: any) {
  await connectDB();
  return app(req, res);
}

if (require.main === module) {
  async function main() {
    await connectDB();
    const server = app.listen(env.PORT, () => console.log(`API running on http://localhost:${env.PORT}/api`));

    const shutdown = (signal: string) => {
      console.log(`${signal} received, shutting down`);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  }

  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
