import { test, expect } from "@playwright/test";

test("unconfigured login is accessible, honest and responsive", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "登录你的工作台" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("系统正在初始化");
  await expect(page.getByRole("button", { name: "登录工作台" })).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "用户名", exact: true }),
  ).toBeDisabled();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("login.png"),
    fullPage: true,
  });
});

test("business routes require authentication", async ({ page }) => {
  for (const path of [
    "/dashboard",
    "/activity",
    "/reports",
    "/reports/unknown",
    "/reports/unknown/history",
    "/security",
    "/daily",
    "/weekly",
    "/tasks",
    "/notifications",
    "/blockers",
    "/blockers/unknown",
    "/admin/users",
    "/admin/projects",
    "/admin/dictionaries",
    "/admin/calendar",
    "/admin/exemptions",
    "/admin/audit",
    "/admin/settings",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("no signup, no fallback credentials, and no fake health", async ({
  request,
}) => {
  expect(
    (await request.post("/api/auth/sign-up/email", { data: {} })).status(),
  ).toBe(404);
  expect(
    (
      await request.post("/api/auth/sign-in/username", {
        data: { username: "nonexistent", password: "nonexistent" },
      })
    ).status(),
  ).toBe(503);
  const health = await request.get("/api/health");
  expect(health.status()).toBe(503);
  const healthBody = await health.json();
  expect(healthBody).toMatchObject({
    status: "not_ready",
    database: "not_checked",
    storage: "not_checked",
    scanner: "not_checked",
  });
  expect(JSON.stringify(healthBody)).not.toMatch(
    /DATABASE_URL|SECRET|PASSWORD/i,
  );
});
