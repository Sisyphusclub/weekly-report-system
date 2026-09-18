import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { resetTotp, resetTotpInput } from "./reset-totp-service";

async function main() {
  if (process.stdin.isTTY)
    throw new Error("Provide recovery JSON through stdin");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 8192) throw new Error("Input too large");
    chunks.push(Buffer.from(chunk));
  }
  const input = resetTotpInput.parse(
    JSON.parse(Buffer.concat(chunks).toString("utf8")),
  );
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  try {
    await resetTotp(drizzle(pool), input);
    console.log(
      "TOTP reset recorded. Sessions revoked; password change is required. Boss and admin accounts must enroll TOTP again.",
    );
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "TOTP reset failed. Check input, organization, operator account, target TOTP state and migrations. No credentials have been logged.",
  );
  process.exitCode = 1;
});
