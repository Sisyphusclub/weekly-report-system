import { spawnSync } from "node:child_process";

const commands = [
  ["typecheck", "npm run typecheck"],
  ["lint", "npm run lint"],
  ["format", "npm run format:check"],
  ["tests", "npm run test"],
  ["schema", "npx drizzle-kit check"],
  ["build", "npm run build"],
];

for (const [name, command] of commands) {
  console.log(`\n== ${name} ==`);
  const result = spawnSync(command, {
    shell: true,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
console.log("\nAll verification gates passed.");
