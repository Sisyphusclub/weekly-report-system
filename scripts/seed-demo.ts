import { and, asc, eq, gte, lte, ne } from "drizzle-orm";
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

type DemoEntryStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "DONE"
  | "CANCELED";

type DemoDailyEntry = {
  content: string;
  status: DemoEntryStatus;
  category: string;
  deliverables: string[];
  projectId: string;
};

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
        await tx
          .update(user)
          .set({ name: input.name, title: input.title, status: "ACTIVE" })
          .where(eq(user.id, existing.id));
        return (
          await tx.select().from(user).where(eq(user.id, existing.id)).limit(1)
        )[0];
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
      name: "李正远",
      role: "EMPLOYEE",
      title: "内容运营工程师",
    });
    const demoTeam = [
      boss,
      employee,
      ...(await Promise.all([
        ["demo_yujipeng", "于继鹏", "后端开发"],
        ["demo_lixue", "李雪", "产品运营"],
        ["demo_luchuanmin", "卢传民", "研发工程师"],
        ["demo_yanglifei", "杨力飞", "测试工程师"],
        ["demo_yuyuanxin", "于元鑫", "前端开发"],
        ["demo_yumiao", "于淼", "项目运营"],
        ["demo_pujingjing", "朴景璟", "产品经理"],
        ["demo_liutianyi", "刘天一", "研发工程师"],
        ["demo_wangsiyuan", "王思远", "数据分析"],
        ["demo_chenlu", "陈璐", "交付运营"],
        ["demo_zhaozihan", "赵子涵", "测试工程师"],
      ].map(([username, name, title]) =>
        ensureUser({
          username,
          name,
          role: "EMPLOYEE",
          title,
        }),
      ))),
    ];
    const zhangweichen = await ensureUser({
      username: "zhangweichen",
      name: "张尉晨",
      role: "EMPLOYEE",
      title: "研发工程师",
    });
    demoTeam.push(zhangweichen);
    const [staleDemoMember] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, "demo_sunmingyuan"))
      .limit(1);
    if (staleDemoMember)
      await tx
        .update(user)
        .set({ status: "DISABLED" })
        .where(eq(user.id, staleDemoMember.id));
    if (staleDemoMember)
      await tx
        .delete(projectMember)
        .where(
          and(
            eq(projectMember.organizationId, org.id),
            eq(projectMember.userId, staleDemoMember.id),
          ),
        );
    if (staleDemoMember)
      await tx
        .update(report)
        .set({
          status: "DRAFT",
          planEntries: [],
          workEntries: [],
          blockers: [],
          submittedAt: null,
          revisionNumber: 0,
        })
        .where(
          and(
            eq(report.organizationId, org.id),
            eq(report.authorId, staleDemoMember.id),
            eq(report.type, "DAILY"),
            gte(report.reportDate, monday),
            lte(report.reportDate, addDays(monday, 6)),
          ),
        );

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
      for (const userId of demoTeam.map((member) => member.id))
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
      overrideEntries?: {
        planEntries: DemoDailyEntry[];
        workEntries: DemoDailyEntry[];
        blockers?: unknown[];
      },
    ) {
      const isEmployee = authorId === employee.id;
      const defaultPlanEntries = isEmployee
        ? [
            {
              content: "协助教师导出整本教材资源",
              status: "DONE" as const,
              category: "综合事务",
              deliverables: [],
              projectId: projects.content.id,
            },
            {
              content: "协助教师完成 3 个独立章节内容导出",
              status: "DONE" as const,
              category: "综合事务",
              deliverables: [],
              projectId: projects.content.id,
            },
            {
              content: "数智云编辑器打印导出测试与缺陷排查",
              status: date === today ? ("IN_PROGRESS" as const) : ("DONE" as const),
              category: "测试",
              deliverables: [],
              projectId: projects.growth.id,
            },
          ]
        : [
            {
              content: "确认团队进度与本周风险",
              status: "DONE" as const,
              category: "会议协作",
              deliverables: [],
              projectId: projects.growth.id,
            },
          ];
      const defaultWorkEntries = isEmployee
        ? [
            {
              content: "协助教师导出整本教材资源",
              status: "DONE" as const,
              category: "综合事务",
              deliverables: ["教材 1 本", "章节 13 章"],
              projectId: projects.content.id,
            },
            {
              content: "协助教师完成 3 个独立章节内容导出",
              status: "DONE" as const,
              category: "综合事务",
              deliverables: ["章节 3 章"],
              projectId: projects.content.id,
            },
            {
              content: "数智云编辑器打印导出测试与缺陷排查",
              status: "DONE" as const,
              category: "测试",
              deliverables: ["提出缺陷 2 个"],
              projectId: projects.growth.id,
            },
          ]
        : [
            {
              content: "完成团队进度同步与风险确认",
              status: "DONE" as const,
              category: "会议协作",
              deliverables: ["进度纪要 1 份"],
              projectId: projects.growth.id,
            },
          ];
      const planEntries = overrideEntries?.planEntries ?? defaultPlanEntries;
      const workEntries = overrideEntries?.workEntries ?? defaultWorkEntries;
      const structured = {
        summary,
        planEntries,
        workEntries,
        blockers: overrideEntries?.blockers ?? [],
      };
      const submitted = status === "SUBMITTED";
      const submittedAt = submitted
        ? date === today
          ? new Date()
          : atShanghai(date, 17, 30)
        : null;
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
      if (existing) {
        await tx
          .update(report)
          .set({
            ...structured,
            status,
            submittedAt,
            revisionNumber: submitted ? 1 : 0,
          })
          .where(eq(report.id, existing.id));
        return (
          await tx.select().from(report).where(eq(report.id, existing.id)).limit(1)
        )[0];
      }
      const created = {
        id: crypto.randomUUID(),
        organizationId: org.id,
        authorId,
        type: "DAILY" as const,
        status,
        reportDate: date,
        dueAt: atShanghai(date, 18),
        submittedAt,
        ...structured,
        wasLate: false,
        revisionNumber: submitted ? 1 : 0,
        calendarVersion: 1,
      };
      await tx.insert(report).values(created);
      return (
        await tx.select().from(report).where(eq(report.id, created.id)).limit(1)
      )[0];
    }

    const planCountByName: Record<string, number> = {
      林晓峰: 2,
      李正远: 3,
      于继鹏: 2,
      李雪: 1,
      卢传民: 2,
      杨力飞: 1,
      于元鑫: 1,
      于淼: 3,
      "朴景璟": 4,
      刘天一: 4,
      王思远: 2,
      陈璐: 1,
      赵子涵: 1,
      张尉晨: 1,
    };
    const todayOrder = [
      employee,
      ...demoTeam.filter((member) => member.id !== employee.id),
    ];
    const todayOffset = Math.max(
      0,
      Math.min(
        4,
        Math.round(
          (new Date(`${today}T00:00:00Z`).getTime() -
            new Date(`${monday}T00:00:00Z`).getTime()) /
            86_400_000,
        ),
      ),
    );
    const categorySequence = [
      "综合事务",
      "综合事务",
      "测试",
      ...Array.from({ length: 25 }, () => "修复"),
      ...Array.from({ length: 7 }, () => "开发"),
      ...Array.from({ length: 5 }, () => "需求"),
      ...Array.from({ length: 2 }, () => "测试"),
      ...Array.from({ length: 3 }, () => "部署"),
      ...Array.from({ length: 1 }, () => "综合事务"),
      ...Array.from({ length: 1 }, () => "回归"),
      ...Array.from({ length: 28 }, () => "项目协同"),
    ];
    const deliverablesByIndex: Record<number, string[]> = {
      0: ["教材 1 本", "章节 13 章"],
      1: ["章节 3 章"],
      2: ["提出缺陷 2 个"],
      3: ["回归测试 38 个"],
      4: ["开发 22 项"],
      5: ["文档 11 份"],
      6: ["接口 5 个"],
      7: ["文件 5 份"],
      8: ["开发 4 个"],
      9: ["功能 3 项"],
      10: ["缺陷票 2 个"],
      11: ["页面 1 个"],
      12: ["接口 1 项"],
    };
    const nonDoneStatuses: Record<number, DemoEntryStatus> = {
      25: "IN_PROGRESS",
      46: "IN_PROGRESS",
      60: "IN_PROGRESS",
      61: "BLOCKED",
      72: "IN_PROGRESS",
    };
    let globalWorkIndex = 0;
    const buildPlanEntries = (member: (typeof demoTeam)[number]) => {
      if (member.id === employee.id)
        return [
          {
            content: "协助教师导出整本教材资源",
            status: "DONE" as const,
            category: "综合事务",
            deliverables: [],
            projectId: projects.content.id,
          },
          {
            content: "协助教师完成 3 个独立章节内容导出",
            status: "DONE" as const,
            category: "综合事务",
            deliverables: [],
            projectId: projects.content.id,
          },
          {
            content: "数智云编辑器打印导出测试与缺陷排查",
            status: "DONE" as const,
            category: "测试",
            deliverables: [],
            projectId: projects.growth.id,
          },
        ];
      const count = planCountByName[member.name] ?? 1;
      return Array.from({ length: count }, (_, index) => ({
        content: `${member.name} · ${["推进本周重点事项", "完成协同事项核对", "整理交付数据", "跟进风险闭环"][index % 4]}`,
        status: "DONE" as const,
        category: ["开发", "需求", "测试", "综合事务"][index % 4],
        deliverables: [],
        projectId: index % 2 ? projects.content.id : projects.growth.id,
      }));
    };
    const buildWorkEntry = (
      member: (typeof demoTeam)[number],
      localIndex: number,
    ): DemoDailyEntry => {
      const index = globalWorkIndex;
      const employeeWork =
        member.id === employee.id && todayOffset >= 0 && localIndex < 3
          ? [
              "协助教师导出整本教材资源",
              "协助教师完成 3 个独立章节内容导出",
              "数智云编辑器打印导出测试与缺陷排查",
            ][localIndex]
          : null;
      const projectId =
        member.id === employee.id && localIndex === 2
          ? projects.growth.id
          : localIndex % 2
            ? projects.content.id
            : projects.growth.id;
      const entry = {
        content:
          employeeWork ??
          `${member.name} · ${["完成接口联调", "推进版本修复", "整理需求验收", "执行回归检查"][localIndex % 4]}`,
        status: nonDoneStatuses[index] ?? ("DONE" as const),
        category: categorySequence[index] ?? "项目协同",
        deliverables: deliverablesByIndex[index] ?? [],
        projectId,
      };
      globalWorkIndex += 1;
      return entry;
    };
    for (const member of demoTeam)
      await tx
        .update(report)
        .set({
          status: "DRAFT",
          planEntries: [],
          workEntries: [],
          blockers: [],
          submittedAt: null,
          revisionNumber: 0,
        })
        .where(
          and(
            eq(report.organizationId, org.id),
            eq(report.authorId, member.id),
            eq(report.type, "DAILY"),
            gte(report.reportDate, monday),
            lte(report.reportDate, addDays(monday, 6)),
            ne(report.reportDate, today),
          ),
        );
    const entriesByMember = new Map<string, DemoDailyEntry[]>();
    for (const member of demoTeam) entriesByMember.set(member.id, []);
    for (const member of todayOrder) {
      const count = planCountByName[member.name] ?? 1;
      const entries = entriesByMember.get(member.id)!;
      for (let index = 0; index < count; index++)
        entries.push(buildWorkEntry(member, index));
    }
    for (let index = 0; index < 47; index++) {
      const member = todayOrder[(index + 3) % todayOrder.length];
      entriesByMember.get(member.id)!.push(buildWorkEntry(member, index));
    }
    const reportDates = [today];
    const dailyReports = [];
    for (const member of demoTeam)
      dailyReports.push(
        await ensureDailyReport(
          member.id,
          today,
          "SUBMITTED",
          `${member.name} 完成今日工作填报，已同步计划与实际进度。`,
          {
            planEntries: buildPlanEntries(member),
            workEntries: entriesByMember.get(member.id) ?? [],
          },
        ),
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
