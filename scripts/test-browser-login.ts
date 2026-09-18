import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium, expect } from "@playwright/test";
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
        if (viewport.width === 1440) {
          const summary = `日报验收 ${randomUUID()}`;
          await page.getByLabel("工作总结", { exact: true }).fill(summary);
          await page
            .getByLabel("无实际任务时的原因", { exact: true })
            .fill("当日培训，无项目任务");
          await page
            .getByLabel("无下一周期计划时的原因", { exact: true })
            .fill("等待下一周期安排");
          await page
            .getByRole("button", { name: "保存草稿", exact: true })
            .click();
          await expect
            .poll(
              async () =>
                (
                  await pool.query(
                    "SELECT summary FROM report WHERE author_id=$1 AND type='DAILY'",
                    [id],
                  )
                ).rows[0]?.summary,
            )
            .toBe(summary);
          await page.reload();
          await expect(
            page.getByLabel("工作总结", { exact: true }),
          ).toHaveValue(summary);
          await page
            .getByRole("button", { name: "预览并提交", exact: true })
            .click();
          await expect(
            page.getByRole("region", { name: "提交预览", exact: true }),
          ).toBeVisible();
          await page
            .getByRole("button", { name: "确认提交", exact: true })
            .click();
          await expect
            .poll(
              async () =>
                (
                  await pool.query(
                    "SELECT status FROM report WHERE author_id=$1 AND type='DAILY'",
                    [id],
                  )
                ).rows[0]?.status,
            )
            .toBe("SUBMITTED");
          await page.reload();
          await expect(
            page.getByLabel("工作总结", { exact: true }),
          ).toBeDisabled();
          console.log(
            "PASS: daily draft persistence, reload, submission preview, database submission, submitted form lock",
          );
          // A fixed past week makes submission independent of today's weekday.
          for (const date of [
            "2026-09-07",
            "2026-09-08",
            "2026-09-09",
            "2026-09-10",
            "2026-09-11",
          ]) {
            await pool.query(
              "INSERT INTO report(id,organization_id,author_id,type,status,report_date,due_at,submitted_at,calendar_version,summary) VALUES($1,$2,$3,'DAILY','SUBMITTED',$4,$4::date + interval '18 hours',now(),0,$5)",
              [randomUUID(), org, id, date, `日报来源 ${date}`],
            );
          }
          await page.goto(`${origin}/weekly?date=2026-09-11`);
          await page
            .getByLabel("本周总结", { exact: true })
            .fill("周报快照验收");
          await page
            .getByRole("button", { name: "保存草稿", exact: true })
            .click();
          await expect(page.getByRole("status")).toHaveText("周报草稿已保存");
          await page.reload();
          await expect(
            page.getByLabel("本周总结", { exact: true }),
          ).toHaveValue("周报快照验收");
          await page
            .getByRole("button", { name: "提交周报", exact: true })
            .click();
          await expect(
            page.getByLabel("本周总结", { exact: true }),
          ).toBeDisabled();
          await expect(
            page.getByRole("link", { name: "查看已提交周报" }),
          ).toBeVisible();
          const weekly = await pool.query(
            "SELECT id,status FROM report WHERE author_id=$1 AND type='WEEKLY'",
            [id],
          );
          assert.equal(weekly.rows[0].status, "SUBMITTED");
          const revisions = await pool.query(
            "SELECT snapshot FROM report_revision WHERE report_id=$1 ORDER BY revision_number DESC LIMIT 1",
            [weekly.rows[0].id],
          );
          assert.equal(revisions.rows[0].snapshot.summaries.length, 5);
          await page.reload();
          await expect(
            page.getByLabel("本周总结", { exact: true }),
          ).toBeDisabled();
          console.log(
            "PASS: weekly draft reload, submitted daily aggregation, immediate submit lock, persisted snapshot",
          );
          const projectId = randomUUID(),
            categoryId = randomUUID(),
            planId = randomUUID();
          await pool.query(
            "INSERT INTO project(id,organization_id,name,owner_id) VALUES($1,$2,'滚动验收',$3)",
            [projectId, org, id],
          );
          await pool.query(
            "INSERT INTO category(id,organization_id,name) VALUES($1,$2,'开发')",
            [categoryId, org],
          );
          await pool.query(
            "INSERT INTO work_task(id,organization_id,created_by_id,primary_assignee_id,project_id,category_id,category_name,content,kind,status,due_date) VALUES($1,$2,$3,$3,$4,$5,'开发','未完成计划','PLAN','IN_PROGRESS','2026-09-17')",
            [planId, org, id, projectId, categoryId],
          );
          const roll = () =>
            context.request.post(`${origin}/api/tasks/roll`, {
              headers: { origin },
              data: { taskId: planId, version: 1, dueDate: "2026-09-18" },
            });
          const responses = await Promise.all([roll(), roll()]);
          for (const response of responses)
            assert.equal(response.status(), 200);
          const results = await Promise.all(
            responses.map((response) => response.json()),
          );
          assert.equal(results[0].id, results[1].id);
          const rolled = await pool.query(
            "SELECT id,status,source_task_id FROM work_task WHERE source_task_id=$1",
            [planId],
          );
          assert.equal(rolled.rowCount, 1);
          assert.equal(rolled.rows[0].status, "TODO");
          assert.equal(rolled.rows[0].source_task_id, planId);
          assert.equal(
            (
              await pool.query("SELECT status FROM work_task WHERE id=$1", [
                planId,
              ])
            ).rows[0].status,
            "IN_PROGRESS",
          );
          const stale = await context.request.post(`${origin}/api/tasks/roll`, {
            headers: { origin },
            data: { taskId: planId, version: 2, dueDate: "2026-09-19" },
          });
          assert.equal(stale.status(), 409);
          console.log(
            "PASS: authenticated plan rolling, source preservation, concurrent idempotency, stale version rejection",
          );
          await page.goto(`${origin}/tasks`);
          const sourceCard = page
            .getByRole("region", { name: "任务列表", exact: true })
            .locator(":scope > div")
            .filter({ has: page.locator("span", { hasText: "2026-09-17" }) });
          await expect(sourceCard).toHaveCount(1);
          await expect(async () => {
            await sourceCard.getByLabel(/新截止日期/).fill("2026-09-20");
            await expect(
              sourceCard.getByRole("button", { name: "滚动计划", exact: true }),
            ).toBeEnabled({ timeout: 1000 });
          }).toPass({ timeout: 10000 });
          await sourceCard
            .getByRole("button", { name: "滚动计划", exact: true })
            .click();
          await expect(sourceCard.getByRole("status")).toHaveText(
            "后续计划已创建",
          );
          await expect
            .poll(
              async () =>
                (
                  await pool.query(
                    "SELECT count(*)::int AS count FROM work_task WHERE source_task_id=$1 AND due_date='2026-09-20'",
                    [planId],
                  )
                ).rows[0].count,
            )
            .toBe(1);
          await page.reload();
          await expect(
            page
              .getByRole("region", { name: "任务列表", exact: true })
              .locator(":scope > div")
              .filter({ has: page.locator("span", { hasText: "2026-09-20" }) }),
          ).toHaveCount(1);
          console.log(
            "PASS: plan roll date input, button submission, success feedback, refreshed task list",
          );
        } else {
          await expect(
            page.getByLabel("工作总结", { exact: true }),
          ).toBeDisabled();
        }
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
