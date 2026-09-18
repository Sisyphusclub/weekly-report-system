CREATE TYPE "public"."blocker_severity" AS ENUM('NORMAL', 'IMPORTANT', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."blocker_status" AS ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('DRAFT', 'SUBMITTED');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('DAILY', 'WEEKLY');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('EMPLOYEE', 'BOSS', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."task_kind" AS ENUM('ACTUAL', 'PLAN');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('PENDING', 'ACTIVE', 'LOCKED', 'DISABLED');--> statement-breakpoint
CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"password" text,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"result" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocker" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"coordinator_id" text,
	"project_id" text,
	"task_id" text,
	"severity" "blocker_severity" NOT NULL,
	"status" "blocker_status" DEFAULT 'OPEN' NOT NULL,
	"description" text NOT NULL,
	"is_sensitive" boolean DEFAULT false NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"resolution" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliverable" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"task_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"unit_name" text NOT NULL,
	"quantity" numeric(16, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deliverable_nonnegative" CHECK ("deliverable"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "deliverable_unit" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deliverable_unit_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Shanghai' NOT NULL,
	"locale" text DEFAULT 'zh-CN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_id" text NOT NULL,
	"status" "project_status" DEFAULT 'PLANNED' NOT NULL,
	"start_date" date,
	"target_end_date" date,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "project_member" (
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" numeric NOT NULL,
	CONSTRAINT "auth_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"author_id" text NOT NULL,
	"type" "report_type" NOT NULL,
	"status" "report_status" DEFAULT 'DRAFT' NOT NULL,
	"report_date" date,
	"week_start" date,
	"week_end" date,
	"week_label" date,
	"due_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"no_work_reason" text,
	"no_plan_reason" text,
	"summary" text,
	"was_late" boolean DEFAULT false NOT NULL,
	"revision_number" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"calendar_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_period" CHECK (("report"."type" = 'DAILY' AND "report"."report_date" IS NOT NULL AND "report"."week_start" IS NULL AND "report"."week_end" IS NULL AND "report"."week_label" IS NULL) OR ("report"."type" = 'WEEKLY' AND "report"."report_date" IS NULL AND "report"."week_start" IS NOT NULL AND "report"."week_end" = "report"."week_start" + 6 AND "report"."week_label" = "report"."week_start" + 4 AND EXTRACT(ISODOW FROM "report"."week_start") = 1)),
	CONSTRAINT "report_submission" CHECK (("report"."status" = 'DRAFT' AND "report"."submitted_at" IS NULL) OR ("report"."status" = 'SUBMITTED' AND "report"."submitted_at" IS NOT NULL)),
	CONSTRAINT "report_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "report_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"report_id" text NOT NULL,
	"revision_number" integer NOT NULL,
	"editor_id" text NOT NULL,
	"reason" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"diff" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_task" (
	"organization_id" text NOT NULL,
	"report_id" text NOT NULL,
	"task_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"source_report_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reporting_exemption" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exemption_date_order" CHECK ("reporting_exemption"."end_date" >= "reporting_exemption"."start_date")
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "task_collaborator" (
	"organization_id" text NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"verified" boolean DEFAULT true,
	"failed_verification_count" integer DEFAULT 0,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text NOT NULL,
	"display_username" text,
	"role" "user_role" DEFAULT 'EMPLOYEE' NOT NULL,
	"status" "user_status" DEFAULT 'PENDING' NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_email_unique" UNIQUE("email"),
	CONSTRAINT "app_user_username_unique" UNIQUE("username"),
	CONSTRAINT "app_user_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_calendar_day" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"date" date NOT NULL,
	"is_workday" boolean NOT NULL,
	"version" integer NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_task" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"primary_assignee_id" text NOT NULL,
	"project_id" text NOT NULL,
	"category_id" text NOT NULL,
	"category_name" text NOT NULL,
	"content" text NOT NULL,
	"kind" "task_kind" NOT NULL,
	"status" "task_status" DEFAULT 'TODO' NOT NULL,
	"work_date" date,
	"due_date" date,
	"source_task_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_version_positive" CHECK ("work_task"."version" > 0),
	CONSTRAINT "plan_due_date_required" CHECK ("work_task"."kind" <> 'PLAN' OR "work_task"."due_date" IS NOT NULL),
	CONSTRAINT "work_task_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organization_id_actor_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","actor_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocker" ADD CONSTRAINT "blocker_organization_id_reporter_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","reporter_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocker" ADD CONSTRAINT "blocker_organization_id_coordinator_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","coordinator_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocker" ADD CONSTRAINT "blocker_organization_id_project_id_project_organization_id_id_fk" FOREIGN KEY ("organization_id","project_id") REFERENCES "public"."project"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocker" ADD CONSTRAINT "blocker_organization_id_task_id_work_task_organization_id_id_fk" FOREIGN KEY ("organization_id","task_id") REFERENCES "public"."work_task"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable" ADD CONSTRAINT "deliverable_organization_id_task_id_work_task_organization_id_id_fk" FOREIGN KEY ("organization_id","task_id") REFERENCES "public"."work_task"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable" ADD CONSTRAINT "deliverable_organization_id_unit_id_deliverable_unit_organization_id_id_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."deliverable_unit"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_unit" ADD CONSTRAINT "deliverable_unit_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_organization_id_recipient_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","recipient_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_owner_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","owner_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_organization_id_project_id_project_organization_id_id_fk" FOREIGN KEY ("organization_id","project_id") REFERENCES "public"."project"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_organization_id_user_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","user_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_organization_id_author_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","author_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_revision" ADD CONSTRAINT "report_revision_organization_id_report_id_report_organization_id_id_fk" FOREIGN KEY ("organization_id","report_id") REFERENCES "public"."report"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_revision" ADD CONSTRAINT "report_revision_organization_id_editor_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","editor_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_task" ADD CONSTRAINT "report_task_organization_id_report_id_report_organization_id_id_fk" FOREIGN KEY ("organization_id","report_id") REFERENCES "public"."report"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_task" ADD CONSTRAINT "report_task_organization_id_task_id_work_task_organization_id_id_fk" FOREIGN KEY ("organization_id","task_id") REFERENCES "public"."work_task"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_task" ADD CONSTRAINT "report_task_organization_id_source_report_id_report_organization_id_id_fk" FOREIGN KEY ("organization_id","source_report_id") REFERENCES "public"."report"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporting_exemption" ADD CONSTRAINT "reporting_exemption_organization_id_user_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","user_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporting_exemption" ADD CONSTRAINT "reporting_exemption_organization_id_created_by_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","created_by_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_collaborator" ADD CONSTRAINT "task_collaborator_organization_id_task_id_work_task_organization_id_id_fk" FOREIGN KEY ("organization_id","task_id") REFERENCES "public"."work_task"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_collaborator" ADD CONSTRAINT "task_collaborator_organization_id_user_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","user_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_two_factor" ADD CONSTRAINT "auth_two_factor_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_calendar_day" ADD CONSTRAINT "work_calendar_day_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_task" ADD CONSTRAINT "work_task_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_task" ADD CONSTRAINT "work_task_organization_id_created_by_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","created_by_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_task" ADD CONSTRAINT "work_task_organization_id_primary_assignee_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","primary_assignee_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_task" ADD CONSTRAINT "work_task_organization_id_project_id_project_organization_id_id_fk" FOREIGN KEY ("organization_id","project_id") REFERENCES "public"."project"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_task" ADD CONSTRAINT "work_task_organization_id_category_id_category_organization_id_id_fk" FOREIGN KEY ("organization_id","category_id") REFERENCES "public"."category"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_task" ADD CONSTRAINT "work_task_organization_id_source_task_id_work_task_organization_id_id_fk" FOREIGN KEY ("organization_id","source_task_id") REFERENCES "public"."work_task"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider" ON "auth_account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_org_created" ON "audit_log" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "blocker_org_status" ON "blocker" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "category_org_id" ON "category" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "category_org_name" ON "category" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "deliverable_task_unit" ON "deliverable" USING btree ("task_id","unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_org_id" ON "deliverable_unit" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_org_name" ON "deliverable_unit" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_dedupe" ON "notification" USING btree ("organization_id","recipient_id","dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "project_org_id" ON "project" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_member_unique" ON "project_member" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_org_id" ON "report" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_author_date" ON "report" USING btree ("author_id","report_date") WHERE "report"."type" = 'DAILY';--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_author_start" ON "report" USING btree ("author_id","week_start") WHERE "report"."type" = 'WEEKLY';--> statement-breakpoint
CREATE INDEX "report_org_status_date" ON "report" USING btree ("organization_id","status","report_date");--> statement-breakpoint
CREATE UNIQUE INDEX "revision_number_unique" ON "report_revision" USING btree ("report_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "report_task_unique" ON "report_task" USING btree ("report_id","task_id");--> statement-breakpoint
CREATE INDEX "session_user" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_collaborator_unique" ON "task_collaborator" USING btree ("task_id","user_id");--> statement-breakpoint
CREATE INDEX "two_factor_user" ON "auth_two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_org_id" ON "app_user" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "verification_identifier" ON "auth_verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_day_version" ON "work_calendar_day" USING btree ("organization_id","date","version");--> statement-breakpoint
CREATE UNIQUE INDEX "task_org_id" ON "work_task" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "task_org_project_date" ON "work_task" USING btree ("organization_id","project_id","work_date");
