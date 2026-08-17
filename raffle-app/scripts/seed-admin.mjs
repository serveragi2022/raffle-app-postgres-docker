// Creates (or updates the password of) a user — admin by default.
// Usage:
//   ADMIN_EMAIL=admin@company.com ADMIN_PASSWORD=SomeStrongPass DATABASE_URL=... node scripts/seed-admin.mjs
//   ADMIN_ROLE=viewer ADMIN_EMAIL=viewer@company.com ADMIN_PASSWORD=... node scripts/seed-admin.mjs
// Inside Docker Compose (recommended): npm run seed:admin
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "..", ".env");

if (fs.existsSync(envPath)) {
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim();
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value.replace(/^['"]|['"]$/g, "");
    }
  }
}

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_FULL_NAME || "Administrator";
const role = process.env.ADMIN_ROLE === "viewer" ? "viewer" : "admin";
const connectionString = process.env.DATABASE_URL;

if (!email || !password) {
  console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables.");
  process.exit(1);
}
if (!connectionString) {
  console.error("Missing DATABASE_URL environment variable.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("ADMIN_PASSWORD should be at least 8 characters.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

try {
  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `insert into app_users (email, password_hash, full_name, role)
     values ($1, $2, $3, $4)
     on conflict (email) do update set password_hash = excluded.password_hash, full_name = excluded.full_name, role = excluded.role
     returning id, email, role`,
    [email.toLowerCase().trim(), hash, fullName, role]
  );
  console.log("User ready:", result.rows[0]);
} catch (err) {
  console.error("Failed to seed user:", err);
  process.exit(1);
} finally {
  await pool.end();
}
