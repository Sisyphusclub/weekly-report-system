import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  integer,
  date,
  jsonb,
  numeric,
  index,
  uniqueIndex,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const roleEnum = pgEnum("user_role", ["EMPLOYEE", "BOSS", "ADMIN"]);
export const userStatusEnum = pgEnum("user_status", [
  "PENDING",
  "ACTIVE",
  "LOCKED",
  "DISABLED",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELED",
]);
export const reportStatusEnum = pgEnum("report_status", ["DRAFT", "SUBMITTED"]);
export const reportTypeEnum = pgEnum("report_type", ["DAILY", "WEEKLY"]);
export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("Asia/Shanghai"),
  locale: text("locale").notNull().default("zh-CN"),
  ...timestamps(),
});
export const user = pgTable(
  "app_user",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    username: text("username").notNull().unique(),
    displayUsername: text("display_username"),
    role: roleEnum("role").notNull().default("EMPLOYEE"),
    status: userStatusEnum("status").notNull().default("PENDING"),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    loginLockedUntil: timestamp("login_locked_until", { withTimezone: true }),
    title: text("title"),
    ...timestamps(),
  },
  (t) => [uniqueIndex("user_org_id").on(t.organizationId, t.id)],
);
export const session = pgTable(
  "auth_session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps(),
  },
  (t) => [index("session_user").on(t.userId)],
);
export const account = pgTable(
  "auth_account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    password: text("password"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("account_provider").on(t.providerId, t.accountId),
    index("account_user").on(t.userId),
  ],
);
export const verification = pgTable(
  "auth_verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps(),
  },
  (t) => [index("verification_identifier").on(t.identifier)],
);
export const twoFactor = pgTable(
  "auth_two_factor",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    verified: boolean("verified").default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (t) => [index("two_factor_user").on(t.userId)],
);
export const rateLimit = pgTable("auth_rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: numeric("last_request", { mode: "number" }).notNull(),
});

export const projectStatusEnum = pgEnum("project_status", [
  "PLANNED",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
]);
export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    name: text("name").notNull(),
    description: text("description"),
    ownerId: text("owner_id").notNull(),
    status: projectStatusEnum("status").notNull().default("PLANNED"),
    startDate: date("start_date"),
    targetEndDate: date("target_end_date"),
    version: integer("version").notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("project_org_id").on(t.organizationId, t.id),
    foreignKey({
      columns: [t.organizationId, t.ownerId],
      foreignColumns: [user.organizationId, user.id],
    }),
  ],
);
export const projectMember = pgTable(
  "project_member",
  {
    organizationId: text("organization_id").notNull(),
    projectId: text("project_id").notNull(),
    userId: text("user_id").notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("project_member_unique").on(t.projectId, t.userId),
    foreignKey({
      columns: [t.organizationId, t.projectId],
      foreignColumns: [project.organizationId, project.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.userId],
      foreignColumns: [user.organizationId, user.id],
    }),
  ],
);
export const category = pgTable(
  "category",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    name: text("name").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("category_org_id").on(t.organizationId, t.id),
    uniqueIndex("category_org_name").on(t.organizationId, t.name),
  ],
);
export const deliverableUnit = pgTable(
  "deliverable_unit",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    name: text("name").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("unit_org_id").on(t.organizationId, t.id),
    uniqueIndex("unit_org_name").on(t.organizationId, t.name),
  ],
);
export const taskKindEnum = pgEnum("task_kind", ["ACTUAL", "PLAN"]);
export const workTask = pgTable(
  "work_task",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    createdById: text("created_by_id").notNull(),
    primaryAssigneeId: text("primary_assignee_id").notNull(),
    projectId: text("project_id").notNull(),
    categoryId: text("category_id").notNull(),
    categoryName: text("category_name").notNull(),
    content: text("content").notNull(),
    kind: taskKindEnum("kind").notNull(),
    status: taskStatusEnum("status").notNull().default("TODO"),
    workDate: date("work_date"),
    dueDate: date("due_date"),
    sourceTaskId: text("source_task_id"),
    version: integer("version").notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("task_org_id").on(t.organizationId, t.id),
    index("task_org_project_date").on(
      t.organizationId,
      t.projectId,
      t.workDate,
    ),
    foreignKey({
      columns: [t.organizationId, t.createdById],
      foreignColumns: [user.organizationId, user.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.primaryAssigneeId],
      foreignColumns: [user.organizationId, user.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.projectId],
      foreignColumns: [project.organizationId, project.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.categoryId],
      foreignColumns: [category.organizationId, category.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.sourceTaskId],
      foreignColumns: [t.organizationId, t.id],
    }),
    check("task_version_positive", sql`${t.version} > 0`),
    check(
      "plan_due_date_required",
      sql`${t.kind} <> 'PLAN' OR ${t.dueDate} IS NOT NULL`,
    ),
  ],
);
export const taskCollaborator = pgTable(
  "task_collaborator",
  {
    organizationId: text("organization_id").notNull(),
    taskId: text("task_id").notNull(),
    userId: text("user_id").notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("task_collaborator_unique").on(t.taskId, t.userId),
    foreignKey({
      columns: [t.organizationId, t.taskId],
      foreignColumns: [workTask.organizationId, workTask.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.userId],
      foreignColumns: [user.organizationId, user.id],
    }),
  ],
);
export const deliverable = pgTable(
  "deliverable",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    taskId: text("task_id").notNull(),
    unitId: text("unit_id").notNull(),
    unitName: text("unit_name").notNull(),
    quantity: numeric("quantity", { precision: 16, scale: 4 }).notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("deliverable_task_unit").on(t.taskId, t.unitId),
    foreignKey({
      columns: [t.organizationId, t.taskId],
      foreignColumns: [workTask.organizationId, workTask.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.unitId],
      foreignColumns: [deliverableUnit.organizationId, deliverableUnit.id],
    }),
    check("deliverable_nonnegative", sql`${t.quantity} >= 0`),
  ],
);
export const report = pgTable(
  "report",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    authorId: text("author_id").notNull(),
    type: reportTypeEnum("type").notNull(),
    status: reportStatusEnum("status").notNull().default("DRAFT"),
    reportDate: date("report_date"),
    weekStart: date("week_start"),
    weekEnd: date("week_end"),
    weekLabel: date("week_label"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    noWorkReason: text("no_work_reason"),
    noPlanReason: text("no_plan_reason"),
    summary: text("summary"),
    wasLate: boolean("was_late").notNull().default(false),
    revisionNumber: integer("revision_number").notNull().default(0),
    version: integer("version").notNull().default(1),
    calendarVersion: integer("calendar_version").notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("report_org_id").on(t.organizationId, t.id),
    uniqueIndex("daily_author_date")
      .on(t.authorId, t.reportDate)
      .where(sql`${t.type} = 'DAILY'`),
    uniqueIndex("weekly_author_start")
      .on(t.authorId, t.weekStart)
      .where(sql`${t.type} = 'WEEKLY'`),
    index("report_org_status_date").on(
      t.organizationId,
      t.status,
      t.reportDate,
    ),
    foreignKey({
      columns: [t.organizationId, t.authorId],
      foreignColumns: [user.organizationId, user.id],
    }),
    check(
      "report_period",
      sql`(${t.type} = 'DAILY' AND ${t.reportDate} IS NOT NULL AND ${t.weekStart} IS NULL AND ${t.weekEnd} IS NULL AND ${t.weekLabel} IS NULL) OR (${t.type} = 'WEEKLY' AND ${t.reportDate} IS NULL AND ${t.weekStart} IS NOT NULL AND ${t.weekEnd} IS NOT NULL AND ${t.weekLabel} IS NOT NULL AND ${t.weekEnd} = ${t.weekStart} + 6 AND ${t.weekLabel} = ${t.weekStart} + 4 AND EXTRACT(ISODOW FROM ${t.weekStart}) = 1)`,
    ),
    check(
      "report_submission",
      sql`(${t.status} = 'DRAFT' AND ${t.submittedAt} IS NULL) OR (${t.status} = 'SUBMITTED' AND ${t.submittedAt} IS NOT NULL)`,
    ),
  ],
);
export const reportTask = pgTable(
  "report_task",
  {
    organizationId: text("organization_id").notNull(),
    reportId: text("report_id").notNull(),
    taskId: text("task_id").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    sourceReportId: text("source_report_id"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("report_task_unique").on(t.reportId, t.taskId),
    foreignKey({
      columns: [t.organizationId, t.reportId],
      foreignColumns: [report.organizationId, report.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.taskId],
      foreignColumns: [workTask.organizationId, workTask.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.sourceReportId],
      foreignColumns: [report.organizationId, report.id],
    }),
  ],
);
export const reportRevision = pgTable(
  "report_revision",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    reportId: text("report_id").notNull(),
    revisionNumber: integer("revision_number").notNull(),
    editorId: text("editor_id").notNull(),
    reason: text("reason").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    diff: jsonb("diff").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("revision_number_unique").on(t.reportId, t.revisionNumber),
    foreignKey({
      columns: [t.organizationId, t.reportId],
      foreignColumns: [report.organizationId, report.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.editorId],
      foreignColumns: [user.organizationId, user.id],
    }),
  ],
);
export const blockerSeverityEnum = pgEnum("blocker_severity", [
  "NORMAL",
  "IMPORTANT",
  "URGENT",
]);
export const blockerStatusEnum = pgEnum("blocker_status", [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
]);
export const blocker = pgTable(
  "blocker",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    reporterId: text("reporter_id").notNull(),
    coordinatorId: text("coordinator_id"),
    projectId: text("project_id"),
    taskId: text("task_id"),
    severity: blockerSeverityEnum("severity").notNull(),
    status: blockerStatusEnum("status").notNull().default("OPEN"),
    description: text("description").notNull(),
    isSensitive: boolean("is_sensitive").notNull().default(false),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolution: text("resolution"),
    version: integer("version").notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    index("blocker_org_status").on(t.organizationId, t.status),
    foreignKey({
      columns: [t.organizationId, t.reporterId],
      foreignColumns: [user.organizationId, user.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.coordinatorId],
      foreignColumns: [user.organizationId, user.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.projectId],
      foreignColumns: [project.organizationId, project.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.taskId],
      foreignColumns: [workTask.organizationId, workTask.id],
    }),
  ],
);
export const notification = pgTable(
  "notification",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    recipientId: text("recipient_id").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("notification_dedupe").on(
      t.organizationId,
      t.recipientId,
      t.dedupeKey,
    ),
    foreignKey({
      columns: [t.organizationId, t.recipientId],
      foreignColumns: [user.organizationId, user.id],
    }),
  ],
);
export const workCalendarDay = pgTable(
  "work_calendar_day",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    date: date("date").notNull(),
    isWorkday: boolean("is_workday").notNull(),
    version: integer("version").notNull(),
    description: text("description").notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("calendar_day_version").on(t.organizationId, t.date, t.version),
  ],
);
export const reportingExemption = pgTable(
  "reporting_exemption",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    userId: text("user_id").notNull(),
    createdById: text("created_by_id").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    reason: text("reason").notNull(),
    ...timestamps(),
  },
  (t) => [
    check("exemption_date_order", sql`${t.endDate} >= ${t.startDate}`),
    foreignKey({
      columns: [t.organizationId, t.userId],
      foreignColumns: [user.organizationId, user.id],
    }),
    foreignKey({
      columns: [t.organizationId, t.createdById],
      foreignColumns: [user.organizationId, user.id],
    }),
  ],
);
export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    result: text("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_org_created").on(t.organizationId, t.createdAt),
    foreignKey({
      columns: [t.organizationId, t.actorId],
      foreignColumns: [user.organizationId, user.id],
    }),
  ],
);
