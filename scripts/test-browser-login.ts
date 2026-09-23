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
      "INSERT INTO app_user(id,organization_id,name,email,username,status) VALUES($1,$2,'浏览器验收',$3,$4,'ACTIVE')",
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
        await page.getByRole("button", { name: "登录", exact: true }).click();
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
          await page
            .getByLabel("补充说明（可选）", { exact: true })
            .fill(summary);
          await page
            .getByLabel("没有实际工作的原因", { exact: true })
            .fill("当日培训，无项目任务");
          await page
            .getByLabel("没有计划的原因", { exact: true })
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
            page.getByLabel("补充说明（可选）", { exact: true }),
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
            page.getByLabel("补充说明（可选）", { exact: true }),
          ).toBeDisabled();
          console.log(
            "PASS: daily draft persistence, reload, submission preview, database submission, submitted form lock",
          );
          const linkedProjectId = randomUUID();
          const linkedCategoryId = randomUUID();
          const linkedTaskId = randomUUID();
          await pool.query(
            "INSERT INTO project(id,organization_id,name,owner_id) VALUES($1,$2,'日报关联验收',$3)",
            [linkedProjectId, org, id],
          );
          await pool.query(
            "INSERT INTO category(id,organization_id,name) VALUES($1,$2,'滚动开发')",
            [linkedCategoryId, org],
          );
          await pool.query(
            "INSERT INTO work_task(id,organization_id,created_by_id,primary_assignee_id,project_id,category_id,category_name,content,kind,status,work_date,due_date) VALUES($1,$2,$3,$3,$4,$5,'开发','日报关联任务','ACTUAL','DONE','2026-09-17','2026-09-16')",
            [linkedTaskId, org, id, linkedProjectId, linkedCategoryId],
          );
          const linkedDaily = await context.request.post(
            `${origin}/api/reports/daily`,
            {
              headers: { origin },
              data: {
                reportDate: "2026-09-17",
                version: 0,
                summary: "已完成关联任务日报",
                noWorkReason: "",
                noPlanReason: "暂无下一周期计划",
                taskIds: [linkedTaskId],
                submit: true,
              },
            },
          );
          assert.equal(
            linkedDaily.status(),
            200,
            `linked daily status ${linkedDaily.status()}: ${await linkedDaily.text()}`,
          );
          const linkedReport = (
            await pool.query(
              "SELECT r.id,r.status,rt.task_id FROM report r JOIN report_task rt ON rt.report_id=r.id WHERE r.author_id=$1 AND r.report_date='2026-09-17' AND r.type='DAILY'",
              [id],
            )
          ).rows[0];
          assert.deepEqual(linkedReport, {
            id: linkedReport.id,
            status: "SUBMITTED",
            task_id: linkedTaskId,
          });
          console.log(
            "PASS: daily submission linked to assigned task and persisted task snapshot relation",
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
          const beforeRevision = (
            await pool.query(
              "SELECT id,version,revision_number FROM report WHERE id=$1",
              [weekly.rows[0].id],
            )
          ).rows[0];
          const historyBefore = (
            await pool.query(
              "SELECT snapshot FROM report_revision WHERE report_id=$1 ORDER BY revision_number",
              [beforeRevision.id],
            )
          ).rows;
          const revise = (reason: string) =>
            context.request.post(`${origin}/api/reports/revisions`, {
              headers: { origin },
              data: {
                reportId: beforeRevision.id,
                version: beforeRevision.version,
                summary: "修订后的周报总结",
                reason,
              },
            });
          assert.equal((await revise("")).status(), 400);
          const revised = await revise("补充验收结果");
          assert.equal(revised.status(), 200);
          assert.equal((await revised.json()).status, "REVISED");
          assert.equal((await revise("重复旧版本请求")).status(), 409);
          const historyAfter = (
            await pool.query(
              "SELECT snapshot,reason FROM report_revision WHERE report_id=$1 ORDER BY revision_number",
              [beforeRevision.id],
            )
          ).rows;
          assert.equal(historyAfter.length, historyBefore.length + 1);
          assert.deepEqual(
            historyAfter.slice(0, -1).map((row) => row.snapshot),
            historyBefore.map((row) => row.snapshot),
          );
          assert.equal(historyAfter.at(-1).reason, "补充验收结果");
          assert.equal(
            historyAfter.at(-1).snapshot.summary,
            "修订后的周报总结",
          );
          assert.deepEqual(
            historyAfter.at(-1).snapshot.summaries,
            revisions.rows[0].snapshot.summaries,
          );
          await page.goto(`${origin}/reports/${beforeRevision.id}/history`);
          await expect(
            page.getByText("修订原因：补充验收结果", { exact: true }),
          ).toBeVisible();
          console.log(
            "PASS: revision reason required, old snapshot preserved, source summaries preserved, stale write rejected, history page rendered",
          );
          // Only this isolated fixture is aged; application clocks stay real.
          await pool.query(
            "UPDATE report SET submitted_at=now()-interval '8 days' WHERE id=$1",
            [beforeRevision.id],
          );
          const approvedState = (
            await pool.query(
              "SELECT summary,version,revision_number FROM report WHERE id=$1",
              [beforeRevision.id],
            )
          ).rows[0];
          const approvalInput = {
            reportId: beforeRevision.id,
            version: approvedState.version,
            summary: "待审核的修订内容",
            reason: "补充逾期更正",
          };
          const pending = await context.request.post(
            `${origin}/api/reports/revisions`,
            { headers: { origin }, data: approvalInput },
          );
          assert.equal(pending.status(), 200);
          const pendingResult = await pending.json();
          assert.equal(pendingResult.status, "PENDING");
          const selfReview = await context.request.post(
            `${origin}/api/reports/revisions/review`,
            {
              headers: { origin },
              data: {
                requestId: pendingResult.id,
                version: 1,
                decision: "APPROVED",
                reason: "尝试自行审核",
              },
            },
          );
          assert.equal(selfReview.status(), 403);
          assert.equal(
            (
              await context.request.post(`${origin}/api/reports/revisions`, {
                headers: { origin },
                data: approvalInput,
              })
            ).status(),
            409,
          );
          assert.deepEqual(
            (
              await pool.query(
                "SELECT summary,version,revision_number FROM report WHERE id=$1",
                [beforeRevision.id],
              )
            ).rows[0],
            approvedState,
          );
          assert.equal(
            (
              await pool.query(
                "SELECT count(*)::int AS count FROM report_revision WHERE report_id=$1",
                [beforeRevision.id],
              )
            ).rows[0].count,
            historyAfter.length,
          );
          const savedRequest = (
            await pool.query(
              "SELECT status,reason,proposed_changes FROM revision_request WHERE id=$1",
              [pendingResult.id],
            )
          ).rows[0];
          assert.equal(savedRequest.status, "PENDING");
          assert.equal(savedRequest.reason, approvalInput.reason);
          assert.equal(
            savedRequest.proposed_changes.summary,
            approvalInput.summary,
          );
          console.log(
            "PASS: expired revision creates one pending request without altering published report or historical snapshots",
          );
          const bossId = randomUUID();
          const bossName = `boss_${bossId.replaceAll("-", "").slice(0, 16)}`;
          const bossPassword = randomUUID();
          await pool.query(
            "INSERT INTO app_user(id,organization_id,name,email,username,role,status) VALUES($1,$2,'审核验收',$3,$4,'BOSS','ACTIVE')",
            [bossId, org, `${bossId}@test.invalid`, bossName],
          );
          await pool.query(
            "INSERT INTO auth_account(id,account_id,provider_id,user_id,password) VALUES($1,$1,'credential',$1,$2)",
            [bossId, await hashPassword(bossPassword)],
          );
          const bossContext = await browser.newContext();
          try {
            const bossPost = (path: string, data: object) =>
              bossContext.request.post(`${origin}${path}`, {
                headers: { origin },
                data,
              });
            assert.equal(
              (
                await bossPost("/api/auth/sign-in/username", {
                  username: bossName,
                  password: bossPassword,
                })
              ).status(),
              200,
            );
            const decision = {
              requestId: pendingResult.id,
              version: 1,
              decision: "APPROVED",
              reason: "核实后同意",
            };
            const review = await bossPost(
              "/api/reports/revisions/review",
              decision,
            );
            assert.equal(review.status(), 200);
            assert.equal((await review.json()).status, "APPROVED");
            assert.equal(
              (
                await bossPost("/api/reports/revisions/review", decision)
              ).status(),
              409,
            );
            const finalReport = (
              await pool.query(
                "SELECT summary,version FROM report WHERE id=$1",
                [beforeRevision.id],
              )
            ).rows[0];
            assert.equal(finalReport.summary, approvalInput.summary);
            assert.equal(finalReport.version, approvedState.version + 1);
            assert.equal(
              (
                await pool.query(
                  "SELECT count(*)::int AS count FROM notification WHERE recipient_id=$1 AND dedupe_key=$2",
                  [id, `revision-reviewed:${pendingResult.id}`],
                )
              ).rows[0].count,
              1,
            );
            assert.equal(
              (
                await pool.query(
                  "SELECT reviewer_id FROM revision_request WHERE id=$1",
                  [pendingResult.id],
                )
              ).rows[0].reviewer_id,
              bossId,
            );
            await pool.query(
              "UPDATE report SET submitted_at=now()-interval '8 days' WHERE id=$1",
              [beforeRevision.id],
            );
            const rejectionInput = {
              reportId: beforeRevision.id,
              version: finalReport.version,
              summary: "不应发布的修订内容",
              reason: "补充逾期更正",
            };
            const rejectedRequest = await context.request.post(
              `${origin}/api/reports/revisions`,
              { headers: { origin }, data: rejectionInput },
            );
            assert.equal(rejectedRequest.status(), 200);
            const rejectedResult = await rejectedRequest.json();
            const rejectDecision = await bossPost(
              "/api/reports/revisions/review",
              {
                requestId: rejectedResult.id,
                version: 1,
                decision: "REJECTED",
                reason: "材料不足，暂不通过",
              },
            );
            assert.equal(rejectDecision.status(), 200);
            assert.equal((await rejectDecision.json()).status, "REJECTED");
            assert.deepEqual(
              (
                await pool.query(
                  "SELECT summary,version FROM report WHERE id=$1",
                  [beforeRevision.id],
                )
              ).rows[0],
              finalReport,
            );
            const rejectedState = (
              await pool.query(
                "SELECT status,reviewer_id,review_reason FROM revision_request WHERE id=$1",
                [rejectedResult.id],
              )
            ).rows[0];
            assert.equal(rejectedState.status, "REJECTED");
            assert.equal(rejectedState.reviewer_id, bossId);
            assert.equal(rejectedState.review_reason, "材料不足，暂不通过");
            assert.equal(
              (
                await bossPost("/api/reports/revisions/review", {
                  requestId: rejectedResult.id,
                  version: 1,
                  decision: "REJECTED",
                  reason: "重复审核",
                })
              ).status(),
              409,
            );
            const blockerCreated = await context.request.post(
              `${origin}/api/blockers`,
              {
                headers: { origin },
                data: {
                  description: "浏览器验收阻塞",
                  severity: "IMPORTANT",
                  isSensitive: false,
                },
              },
            );
            assert.equal(blockerCreated.status(), 201);
            const blockerId = (await blockerCreated.json()).id;
            const blockerState = (
              await pool.query(
                "SELECT version,status FROM blocker WHERE id=$1",
                [blockerId],
              )
            ).rows[0];
            const assignmentDenied = await bossContext.request.patch(
              `${origin}/api/blockers/${blockerId}`,
              {
                headers: { origin },
                data: {
                  action: "ASSIGN",
                  coordinatorId: id,
                  version: blockerState.version,
                },
              },
            );
            assert.equal(assignmentDenied.status(), 400);
            const acknowledgeDenied = await bossContext.request.patch(
              `${origin}/api/blockers/${blockerId}`,
              {
                headers: { origin },
                data: {
                  action: "ACKNOWLEDGE",
                  version: blockerState.version,
                },
              },
            );
            assert.equal(acknowledgeDenied.status(), 403);
            const resolved = await context.request.patch(
              `${origin}/api/blockers/${blockerId}`,
              {
                headers: { origin },
                data: {
                  action: "RESOLVE",
                  resolution: "已完成协调并解除阻塞",
                  version: blockerState.version,
                },
              },
            );
            assert.equal(resolved.status(), 200);
            assert.deepEqual(
              (
                await pool.query(
                  "SELECT status,coordinator_id,resolution FROM blocker WHERE id=$1",
                  [blockerId],
                )
              ).rows[0],
              {
                status: "RESOLVED",
                coordinator_id: null,
                resolution: "已完成协调并解除阻塞",
              },
            );
            const bossPage = await bossContext.newPage();
            await bossPage.goto(`${origin}/dashboard`);
            await expect(
              bossPage.getByRole("heading", { name: "团队工作驾驶舱" }),
            ).toBeVisible();
            await bossPage.goto(`${origin}/blockers`);
            await expect(
              bossPage.getByRole("heading", { name: "阻塞中心" }),
            ).toBeVisible();
            console.log(
              "PASS: boss revision approval and rejection, read-only blocker access, version guard, reviewer identity, notification deduplication, repeated review denial",
            );
          } finally {
            await bossContext.close();
          }
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
            "INSERT INTO work_task(id,organization_id,created_by_id,primary_assignee_id,project_id,category_id,category_name,content,kind,status,due_date) VALUES($1,$2,$3,$3,$4,$5,'滚动开发','未完成计划','PLAN','IN_PROGRESS','2026-09-17')",
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
          await page.waitForURL("**/daily");
          await expect(
            page.getByRole("heading", { name: "今日工作台", exact: true }),
          ).toBeVisible();
          console.log(
            "PASS: retired task management route redirects to the daily workspace",
          );
        } else {
          await expect(
            page.getByLabel("补充说明（可选）", { exact: true }),
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
    const adminId = randomUUID();
    const adminName = `admin_${adminId.replaceAll("-", "").slice(0, 16)}`;
    const adminPassword = randomUUID();
    await pool.query(
      "INSERT INTO app_user(id,organization_id,name,email,username,role,status) VALUES($1,$2,'管理员验收',$3,$4,'ADMIN','ACTIVE')",
      [adminId, org, `${adminId}@test.invalid`, adminName],
    );
    await pool.query(
      "INSERT INTO auth_account(id,account_id,provider_id,user_id,password) VALUES($1,$1,'credential',$1,$2)",
      [adminId, await hashPassword(adminPassword)],
    );
    const adminContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    try {
      const adminPost = (path: string, data: object) =>
        adminContext.request.post(`${origin}${path}`, {
          headers: { origin },
          data,
        });
      const adminPatch = (path: string, data: object) =>
        adminContext.request.patch(`${origin}${path}`, {
          headers: { origin },
          data,
        });
      assert.equal(
        (
          await adminPost("/api/auth/sign-in/username", {
            username: adminName,
            password: adminPassword,
          })
        ).status(),
        200,
      );
      const createdPassword = `Created-${randomUUID()}`;
      const created = await adminPost("/api/admin/users", {
        username: `new_${randomUUID().replaceAll("-", "").slice(0, 12)}`,
        name: "新员工验收",
        title: "测试岗位",
        role: "EMPLOYEE",
        password: createdPassword,
      });
      assert.equal(
        created.status(),
        201,
        `admin create status ${created.status()}`,
      );
      const credential = await created.json();
      const createdRow = (
        await pool.query("SELECT id,status FROM app_user WHERE username=$1", [
          credential.username,
        ])
      ).rows[0];
      assert.equal(createdRow.status, "ACTIVE");
      const employeeContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      try {
        const employeeLogin = await employeeContext.request.post(
          `${origin}/api/auth/sign-in/username`,
          {
            headers: { origin },
            data: {
              username: credential.username,
              password: createdPassword,
            },
          },
        );
        assert.equal(employeeLogin.status(), 200);
        const employeePage = await employeeContext.newPage();
        await employeePage.goto(`${origin}/dashboard`);
        await employeePage.waitForURL("**/dashboard");
        const resetPassword = `Reset-${randomUUID()}`;
        const reset = await adminPost(
          `/api/admin/users/${createdRow.id}/reset-password`,
          { password: resetPassword },
        );
        const resetResult = await reset.json().catch(() => null);
        assert.equal(
          reset.status(),
          200,
          `admin reset status ${reset.status()}: ${JSON.stringify(resetResult)}`,
        );
        assert.equal(
          await (
            await employeeContext.request.get(`${origin}/api/auth/get-session`)
          ).json(),
          null,
        );
        assert.equal(
          (
            await employeeContext.request.post(
              `${origin}/api/auth/sign-in/username`,
              {
                headers: { origin },
                data: {
                  username: credential.username,
                  password: createdPassword,
                },
              },
            )
          ).status(),
          401,
        );
        assert.equal(
          (
            await employeeContext.request.post(
              `${origin}/api/auth/sign-in/username`,
              {
                headers: { origin },
                data: {
                  username: credential.username,
                  password: resetPassword,
                },
              },
            )
          ).status(),
          200,
        );
        const disabled = await adminPatch(`/api/admin/users/${createdRow.id}`, {
          status: "DISABLED",
        });
        assert.equal(disabled.status(), 200);
        assert.equal(
          (
            await employeeContext.request.get(`${origin}/api/auth/get-session`)
          ).status(),
          200,
        );
        await employeePage.goto(`${origin}/daily`);
        await employeePage.waitForURL("**/login");
        console.log(
          "PASS: admin login, active employee creation, password reset, session revocation, disable isolation",
        );
      } finally {
        await employeeContext.close();
      }
    } finally {
      await adminContext.close();
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
