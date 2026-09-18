import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";

async function main() {
  if (process.env.APP_ENV !== "development")
    throw new Error("Development only");
  const origin = process.env.BETTER_AUTH_URL!;
  if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
    throw new Error("Local application required");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const id = randomUUID(),
    org = randomUUID();
  const username = `browser_${id.replaceAll("-", "").slice(0, 16)}`;
  const password = randomUUID();
  const browser = await chromium.launch();
  try {
    await pool.query(
      "INSERT INTO organization(id,name) VALUES($1,'browser verification')",
      [org],
    );
    await pool.query(
      "INSERT INTO app_user(id,organization_id,name,email,username,status,must_change_password) VALUES($1,$2,'浏览器验收',$3,$4,'ACTIVE',false)",
      [id, org, `${id}@test.invalid`, username],
    );
    await pool.query(
      "INSERT INTO auth_account(id,account_id,provider_id,user_id,password) VALUES($1,$1,'credential',$1,$2)",
      [id, await hashPassword(password)],
    );
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport });
      try {
        const page = await context.newPage();
        await page.goto(`${origin}/login`, {
          waitUntil: "domcontentloaded",
          timeout: 10000,
        });
        await page
          .locator('input[name="username"]')
          .waitFor({ state: "visible", timeout: 10000 });
        await page.locator('input[name="username"]').fill(username);
        await page.locator('input[name="password"]').fill(password);
        await page
          .getByRole("button", { name: "登录工作台", exact: true })
          .click();
        await page.waitForURL("**/dashboard", { timeout: 60000 });
        if (!page.url().endsWith("/dashboard")) {
          console.error(
            "Unexpected login URL",
            page.url(),
            (await page.locator("body").innerText()).slice(-500),
          );
          throw new Error("browser login did not reach dashboard");
        }
        const session = await context.request.get(
          `${origin}/api/auth/get-session`,
        );
        assert.equal((await session.json()).user.id, id);
        const denied = await context.request.post(`${origin}/api/admin/users`, {
          headers: { origin },
          data: {},
        });
        assert.equal(denied.status(), 403);
        await page.goto(`${origin}/daily`);
        assert.equal(new URL(page.url()).pathname, "/daily");
        assert.ok(await page.locator("main").isVisible());
        assert.equal(
          (
            await context.request.post(`${origin}/api/auth/sign-out`, {
              headers: { origin },
              data: {},
            })
          ).status(),
          200,
        );
        await page.goto(`${origin}/daily`);
        await page.waitForURL("**/login");
        console.log(
          `PASS: ${viewport.width}px browser login, employee page, admin API denial, logout redirect`,
        );
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await pool.end();
  }
}
main().catch((error: unknown) => {
  if (error instanceof Error)
    console.error(
      error.name,
      error.stack
        ?.split("\n")
        .find((line) => line.includes("test-browser-login.ts:")),
    );
  console.error(
    "Browser authentication verification failed; credentials are not logged.",
  );
  process.exitCode = 1;
});
