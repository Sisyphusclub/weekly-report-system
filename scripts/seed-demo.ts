import { and, asc, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { closePool, getDb } from "../src/lib/db/index.js";
import {
  account,
  auditLog,
  blocker,
  category,
  comment,
  deliverable,
  deliverableUnit,
  notification,
  organization,
  project,
  projectMember,
  report,
  reportRevision,
  reportTask,
  taskStatusHistory,
  user,
  workCalendarDay,
  workTask,
} from "../src/lib/db/schema.js";

const DEMO_PASSWORD = "DemoPassw0rd!2026";

function shanghaiDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(value: string, offset: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function weekStart(value: string) {
  const day = new Date(`${value}T00:00:00Z`).getUTCDay();
  return addDays(value, day === 0 ? -6 : 1 - day);
}

function atShanghai(date: string, hour: number, minute = 0) {
  return new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+08:00`,
  );
}

function snapshot(
  task: typeof workTask.$inferSelect,
  deliveries: Array<typeof deliverable.$inferSelect>,
) {
  return {
    content: task.content,
    kind: task.kind,
    status: task.status,
    categoryName: task.categoryName,
    dueDate: task.dueDate,
    deliverables: deliveries.map((item) => ({
      unitId: item.unitId,
      unitName: item.unitName,
      quantity: item.quantity,
    })),
  };
}

async function main() {
  if (process.env.APP_ENV !== "development")
    throw new Error("Demo seed is available only when APP_ENV=development");

  const db = getDb();
  const password = await hashPassword(DEMO_PASSWORD);
  const today = shanghaiDate();
  const monday = weekStart(today);
  const friday = addDays(monday, 4);

  const result = await db.transaction(async (tx) => {
    let [org] = await tx
      .select()
      .from(organization)
      .orderBy(asc(organization.createdAt))
      .limit(1);
    if (!org) {
      org = {
        id: crypto.randomUUID(),
        name: "市场部演示空间",
        timezone: "Asia/Shanghai",
        locale: "zh-CN",
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await tx.insert(organization).values(org);
    }

    async function ensureUser(input: {
      username: string;
      name: string;
      role: "ADMIN" | "BOSS" | "EMPLOYEE";
      title: string;
    }) {
      const [existing] = await tx
        .select()
        .from(user)
        .where(eq(user.username, input.username))
        .limit(1);
      if (existing) {
        if (existing.organizationId !== org.id)
          throw new Error(`用户 ${input.username} 已属于其他组织`);
        return existing;
      }
      const created = {
        id: crypto.randomUUID(),
        organizationId: org.id,
        name: input.name,
        email: `${input.username}@demo.invalid`,
        username: input.username,
        displayUsername: input.username,
        role: input.role,
        status: "ACTIVE" as const,
        title: input.title,
      };
      await tx.insert(user).values(created);
      await tx.insert(account).values({
        id: crypto.randomUUID(),
        userId: created.id,
        accountId: created.id,
        providerId: "credential",
        password,
      });
      return (
        await tx.select().from(user).where(eq(user.id, created.id)).limit(1)
      )[0];
    }

    const admin = await ensureUser({
      username: "demo_admin",
      name: "演示管理员",
      role: "ADMIN",
      title: "市场部管理员",
    });
    const boss = await ensureUser({
      username: "demo_boss",
      name: "林晓峰",
      role: "BOSS",
      title: "增长负责人",
    });
    const employee = await ensureUser({
      username: "demo_employee",
      name: "周雨桐",
      role: "EMPLOYEE",
      title: "内容运营",
    });

    async function migrateLegacyDemoUser(
      oldUsername: string,
      replacement: typeof employee,
    ) {
      const [legacy] = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.username, oldUsername))
        .limit(1);
      if (!legacy || legacy.id === replacement.id) return;
      await tx
        .delete(projectMember)
        .where(
          and(
            eq(projectMember.organizationId, org.id),
            eq(projectMember.userId, replacement.id),
          ),
        );
      await tx
        .update(project)
        .set({ ownerId: replacement.id })
        .where(
          and(
            eq(project.organizationId, org.id),
            eq(project.ownerId, legacy.id),
          ),
        );
      await tx
        .update(workTask)
        .set({ createdById: replacement.id })
        .where(
          and(
            eq(workTask.organizationId, org.id),
            eq(workTask.createdById, legacy.id),
          ),
        );
      await tx
        .update(workTask)
        .set({ primaryAssigneeId: replacement.id })
        .where(
          and(
            eq(workTask.organizationId, org.id),
            eq(workTask.primaryAssigneeId, legacy.id),
          ),
        );
      // Keep legacy reports in place when the replacement account already has
      // the same report period; report uniqueness makes a blind reassignment unsafe.
      await tx
        .update(blocker)
        .set({ reporterId: replacement.id })
        .where(
          and(
            eq(blocker.organizationId, org.id),
            eq(blocker.reporterId, legacy.id),
          ),
        );
      await tx
        .update(blocker)
        .set({ coordinatorId: replacement.id })
        .where(
          and(
            eq(blocker.organizationId, org.id),
            eq(blocker.coordinatorId, legacy.id),
          ),
        );
      await tx
        .update(comment)
        .set({ authorId: replacement.id })
        .where(
          and(
            eq(comment.organizationId, org.id),
            eq(comment.authorId, legacy.id),
          ),
        );
      // Notifications use a recipient + dedupe key unique constraint; leave
      // legacy notifications attached to the disabled account if needed.
      // Historical status entries keep the original actor for audit fidelity.
      await tx
        .update(projectMember)
        .set({ userId: replacement.id })
        .where(
          and(
            eq(projectMember.organizationId, org.id),
            eq(projectMember.userId, legacy.id),
          ),
        );
      await tx
        .update(user)
        .set({ status: "DISABLED", updatedAt: new Date() })
        .where(eq(user.id, legacy.id));
    }
    await migrateLegacyDemoUser("demo-admin", admin);
    await migrateLegacyDemoUser("demo-boss", boss);
    await migrateLegacyDemoUser("demo-employee", employee);

    async function ensureCategory(name: string, sortOrder: number) {
      const [existing] = await tx
        .select()
        .from(category)
        .where(
          and(eq(category.organizationId, org.id), eq(category.name, name)),
        )
        .limit(1);
      if (existing) return existing;
      const created = {
        id: crypto.randomUUID(),
        organizationId: org.id,
        name,
        sortOrder,
      };
      await tx.insert(category).values(created);
      return (
        await tx
          .select()
          .from(category)
          .where(eq(category.id, created.id))
          .limit(1)
      )[0];
    }

    async function ensureUnit(name: string, sortOrder: number) {
      const [existing] = await tx
        .select()
        .from(deliverableUnit)
        .where(
          and(
            eq(deliverableUnit.organizationId, org.id),
            eq(deliverableUnit.name, name),
          ),
        )
        .limit(1);
      if (existing) return existing;
      const created = {
        id: crypto.randomUUID(),
        organizationId: org.id,
        name,
        sortOrder,
      };
      await tx.insert(deliverableUnit).values(created);
      return (
        await tx
          .select()
          .from(deliverableUnit)
          .where(eq(deliverableUnit.id, created.id))
          .limit(1)
      )[0];
    }

    async function ensureProject(
      name: string,
      description: string,
      ownerId: string,
    ) {
      const [existing] = await tx
        .select()
        .from(project)
        .where(and(eq(project.organizationId, org.id), eq(project.name, name)))
        .limit(1);
      if (existing) return existing;
      const created = {
        id: crypto.randomUUID(),
        organizationId: org.id,
        name,
        description,
        ownerId,
        status: "ACTIVE" as const,
        startDate: monday,
        targetEndDate: addDays(monday, 28),
      };
      await tx.insert(project).values(created);
      return (
        await tx
          .select()
          .from(project)
          .where(eq(project.id, created.id))
          .limit(1)
      )[0];
    }

    async function ensureTask(input: {
      content: string;
      projectId: string;
      categoryId: string;
      categoryName: string;
      kind: "ACTUAL" | "PLAN";
      status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELED";
      workDate: string;
      dueDate: string | null;
    }) {
      const [existing] = await tx
        .select()
        .from(workTask)
        .where(
          and(
            eq(workTask.organizationId, org.id),
            eq(workTask.content, input.content),
          ),
        )
        .limit(1);
      if (existing) return existing;
      const created = {
        id: crypto.randomUUID(),
        organizationId: org.id,
        createdById: admin.id,
        primaryAssigneeId: employee.id,
        ...input,
      };
      await tx.insert(workTask).values(created);
      return (
        await tx
          .select()
          .from(workTask)
          .where(eq(workTask.id, created.id))
          .limit(1)
      )[0];
    }

    const categories = {
      growth: await ensureCategory("用户增长", 1),
      content: await ensureCategory("内容运营", 2),
      analysis: await ensureCategory("数据分析", 3),
    };
    const units = {
      item: await ensureUnit("个", 1),
      article: await ensureUnit("篇", 2),
      report: await ensureUnit("份", 3),
    };
    const projects = {
      growth: await ensureProject(
        "增长实验平台",
        "围绕注册转化和渠道效率推进实验。",
        boss.id,
      ),
      content: await ensureProject(
        "内容运营升级",
        "建立内容排期、复盘和素材复用机制。",
        boss.id,
      ),
    };

    for (const projectId of [projects.growth.id, projects.content.id])
      for (const userId of [boss.id, employee.id])
        await tx
          .insert(projectMember)
          .values({ organizationId: org.id, projectId, userId })
          .onConflictDoNothing();

    const tasks = [
      await ensureTask({
        content: "完成 Q3 用户增长实验方案",
        projectId: projects.growth.id,
        categoryId: categories.growth.id,
        categoryName: categories.growth.name,
        kind: "PLAN",
        status: "IN_PROGRESS",
        workDate: today,
        dueDate: addDays(today, 2),
      }),
      await ensureTask({
        content: "上线落地页 A/B 测试",
        projectId: projects.growth.id,
        categoryId: categories.growth.id,
        categoryName: categories.growth.name,
        kind: "ACTUAL",
        status: "DONE",
        workDate: addDays(today, -2),
        dueDate: null,
      }),
      await ensureTask({
        content: "整理渠道周报数据",
        projectId: projects.growth.id,
        categoryId: categories.analysis.id,
        categoryName: categories.analysis.name,
        kind: "ACTUAL",
        status: "BLOCKED",
        workDate: today,
        dueDate: null,
      }),
      await ensureTask({
        content: "确认品牌内容排期",
        projectId: projects.content.id,
        categoryId: categories.content.id,
        categoryName: categories.content.name,
        kind: "PLAN",
        status: "TODO",
        workDate: today,
        dueDate: addDays(today, 3),
      }),
      await ensureTask({
        content: "产出小红书渠道复盘",
        projectId: projects.content.id,
        categoryId: categories.content.id,
        categoryName: categories.content.name,
        kind: "ACTUAL",
        status: "DONE",
        workDate: addDays(today, -3),
        dueDate: null,
      }),
    ];

    const deliveries = [
      { task: tasks[0], unit: units.report, quantity: "1" },
      { task: tasks[1], unit: units.item, quantity: "2" },
      { task: tasks[4], unit: units.article, quantity: "3" },
    ];
    for (const item of deliveries)
      await tx
        .insert(deliverable)
        .values({
          id: crypto.randomUUID(),
          organizationId: org.id,
          taskId: item.task.id,
          unitId: item.unit.id,
          unitName: item.unit.name,
          quantity: item.quantity,
        })
        .onConflictDoNothing();

    for (const task of tasks.filter((item) => item.kind === "PLAN")) {
      const [history] = await tx
        .select({ id: taskStatusHistory.id })
        .from(taskStatusHistory)
        .where(
          and(
            eq(taskStatusHistory.organizationId, org.id),
            eq(taskStatusHistory.taskId, task.id),
          ),
        )
        .limit(1);
      if (!history)
        await tx.insert(taskStatusHistory).values({
          id: crypto.randomUUID(),
          organizationId: org.id,
          taskId: task.id,
          fromStatus: null,
          toStatus: task.status,
          changedById: employee.id,
          changedAt: atShanghai(task.workDate ?? today, 9, 30),
        });
    }

    for (let offset = 0; offset < 7; offset++) {
      const date = addDays(monday, offset);
      await tx
        .insert(workCalendarDay)
        .values({
          id: crypto.randomUUID(),
          organizationId: org.id,
          date,
          isWorkday: offset < 5,
          version: 1,
          description: offset < 5 ? "工作日" : "周末休息",
        })
        .onConflictDoNothing();
    }

    async function ensureDailyReport(
      authorId: string,
      date: string,
      status: "DRAFT" | "SUBMITTED",
      summary: string,
    ) {
      const [existing] = await tx
        .select()
        .from(report)
        .where(
          and(
            eq(report.organizationId, org.id),
            eq(report.authorId, authorId),
            eq(report.type, "DAILY"),
            eq(report.reportDate, date),
          ),
        )
        .limit(1);
      if (existing) return existing;
      const submitted = status === "SUBMITTED";
      const created = {
        id: crypto.randomUUID(),
        organizationId: org.id,
        authorId,
        type: "DAILY" as const,
        status,
        reportDate: date,
        dueAt: atShanghai(date, 18),
        submittedAt: submitted ? atShanghai(date, 17, 30) : null,
        summary,
        wasLate: false,
        revisionNumber: submitted ? 1 : 0,
        calendarVersion: 1,
      };
      await tx.insert(report).values(created);
      return (
        await tx.select().from(report).where(eq(report.id, created.id)).limit(1)
      )[0];
    }

    const reportDates = [0, 2, 4]
      .map((offset) => addDays(monday, offset))
      .filter((date) => date <= today);
    const dailyReports = [];
    for (const date of reportDates) {
      dailyReports.push(
        await ensureDailyReport(
          employee.id,
          date,
          "SUBMITTED",
          `完成${date === reportDates.at(-1) ? "渠道数据整理与实验跟进" : "增长实验和内容协同"}。`,
        ),
      );
      if (date === reportDates.at(-1))
        dailyReports.push(
          await ensureDailyReport(
            boss.id,
            date,
            "SUBMITTED",
            "完成团队进度同步，确认本周风险与下周重点。",
          ),
        );
    }
    if (today >= monday)
      await ensureDailyReport(
        employee.id,
        today,
        "DRAFT",
        "补充今日渠道数据与待协调事项。 ",
      );

    const weeklyStatus = today >= friday ? "SUBMITTED" : "DRAFT";
    const [existingWeekly] = await tx
      .select()
      .from(report)
      .where(
        and(
          eq(report.organizationId, org.id),
          eq(report.authorId, employee.id),
          eq(report.type, "WEEKLY"),
          eq(report.weekStart, monday),
        ),
      )
      .limit(1);
    const weekly =
      existingWeekly ??
      (
        await tx
          .insert(report)
          .values({
            id: crypto.randomUUID(),
            organizationId: org.id,
            authorId: employee.id,
            type: "WEEKLY",
            status: weeklyStatus,
            weekStart: monday,
            weekEnd: addDays(monday, 6),
            weekLabel: friday,
            dueAt: atShanghai(friday, 18),
            submittedAt:
              weeklyStatus === "SUBMITTED" ? atShanghai(friday, 17, 45) : null,
            summary:
              "本周完成增长实验方案、落地页测试和内容复盘，渠道数据仍需补齐。",
            wasLate: false,
            revisionNumber: weeklyStatus === "SUBMITTED" ? 1 : 0,
            calendarVersion: 1,
          })
          .returning()
      )[0];

    const taskDeliverables = new Map<
      string,
      Array<typeof deliverable.$inferSelect>
    >();
    const allDeliverables = await tx
      .select()
      .from(deliverable)
      .where(eq(deliverable.organizationId, org.id));
    for (const item of allDeliverables)
      taskDeliverables.set(item.taskId, [
        ...(taskDeliverables.get(item.taskId) ?? []),
        item,
      ]);
    for (const task of tasks) {
      const source = dailyReports.find((item) => item.authorId === employee.id);
      await tx
        .insert(reportTask)
        .values({
          organizationId: org.id,
          reportId: weekly.id,
          taskId: task.id,
          sourceReportId: source?.id ?? null,
          snapshot: snapshot(task, taskDeliverables.get(task.id) ?? []),
        })
        .onConflictDoNothing();
    }
    if (weeklyStatus === "SUBMITTED") {
      const [revision] = await tx
        .select({ id: reportRevision.id })
        .from(reportRevision)
        .where(eq(reportRevision.reportId, weekly.id))
        .limit(1);
      if (!revision)
        await tx.insert(reportRevision).values({
          id: crypto.randomUUID(),
          organizationId: org.id,
          reportId: weekly.id,
          revisionNumber: 1,
          editorId: employee.id,
          reason: "演示数据初始化",
          snapshot: { summary: weekly.summary, sourceDates: reportDates },
          diff: { status: ["DRAFT", "SUBMITTED"] },
        });
    }

    async function ensureBlocker(
      description: string,
      severity: "NORMAL" | "IMPORTANT" | "URGENT",
      status: "OPEN" | "RESOLVED",
      taskId: string,
    ) {
      const [existing] = await tx
        .select()
        .from(blocker)
        .where(
          and(
            eq(blocker.organizationId, org.id),
            eq(blocker.description, description),
          ),
        )
        .limit(1);
      if (existing) return existing;
      const created = {
        id: crypto.randomUUID(),
        organizationId: org.id,
        reporterId: employee.id,
        coordinatorId: boss.id,
        projectId: projects.growth.id,
        taskId,
        severity,
        status,
        description,
        acknowledgedAt: status === "RESOLVED" ? atShanghai(today, 10) : null,
        resolvedAt: status === "RESOLVED" ? atShanghai(today, 15) : null,
        resolution:
          status === "RESOLVED" ? "已补齐渠道权限并完成数据同步。" : null,
      };
      await tx.insert(blocker).values(created);
      return (
        await tx
          .select()
          .from(blocker)
          .where(eq(blocker.id, created.id))
          .limit(1)
      )[0];
    }
    await ensureBlocker(
      "渠道数据权限尚未开通，无法完成周报汇总",
      "URGENT",
      "OPEN",
      tasks[2].id,
    );
    await ensureBlocker(
      "素材审批等待品牌团队确认",
      "IMPORTANT",
      "RESOLVED",
      tasks[4].id,
    );

    await tx
      .insert(comment)
      .values({
        id: crypto.randomUUID(),
        organizationId: org.id,
        reportId: dailyReports[0].id,
        authorId: boss.id,
        body: "渠道数据先标记阻塞，明早同步权限进度。",
        mentions: [employee.id],
      })
      .onConflictDoNothing();
    await tx
      .insert(notification)
      .values({
        id: crypto.randomUUID(),
        organizationId: org.id,
        recipientId: boss.id,
        dedupeKey: "demo-blocker-reminder",
        type: "BLOCKER",
        title: "有 1 项紧急阻塞待协调",
        link: "/blockers",
      })
      .onConflictDoNothing();
    await tx.insert(auditLog).values({
      id: crypto.randomUUID(),
      organizationId: org.id,
      actorId: admin.id,
      action: "DEMO_DATA_SEEDED",
      resourceType: "ORGANIZATION",
      resourceId: org.id,
      result: "SUCCESS",
      reason: "开发环境演示数据初始化",
    });

    return {
      organization: org.name,
      users: [admin.username, boss.username, employee.username],
      projects: Object.values(projects).map((item) => item.name),
      taskCount: tasks.length,
      reportCount: dailyReports.length + 1,
    };
  });

  console.log(
    JSON.stringify({ ...result, demoPassword: DEMO_PASSWORD }, null, 2),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Demo seed failed");
    process.exitCode = 1;
  })
  .finally(() => closePool());
