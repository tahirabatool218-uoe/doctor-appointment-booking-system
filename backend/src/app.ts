import express from "express";
import cors from "cors";
import { env } from "./config/env";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware/errorHandler";

export const app = express();

app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(cors({ origin: env.CLIENT_URL.split(",").map((s) => s.trim()) }));
app.use(express.json({ limit: "100kb" }));
app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);
