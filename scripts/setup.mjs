// Creates backend/.env and frontend/.env.local from the .env.example files if they don't exist yet.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const be = "backend/.env", fe = "frontend/.env.local";
if (!existsSync(be)) {
  copyFileSync("backend/.env.example", be);
  writeFileSync(be, readFileSync(be, "utf8").replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomBytes(32).toString("hex")}`));
  console.log("created", be, "(random JWT_SECRET)");
} else console.log(be, "exists, left untouched");
if (!existsSync(fe)) { copyFileSync("frontend/.env.example", fe); console.log("created", fe); } else console.log(fe, "exists, left untouched");
console.log("Next: npm run install:all && npm run seed && npm run dev:backend  (and, in another terminal) npm run dev:frontend");
