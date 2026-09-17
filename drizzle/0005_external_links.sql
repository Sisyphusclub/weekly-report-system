CREATE TABLE IF NOT EXISTS "external_link" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "task_id" text NOT NULL,
  "title" text NOT NULL,
  "url" text NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "external_link_task" ON "external_link" ("organization_id", "task_id");
ALTER TABLE "external_link" ADD CONSTRAINT "external_link_task_fk" FOREIGN KEY ("organization_id", "task_id") REFERENCES "work_task"("organization_id", "id");
ALTER TABLE "external_link" ADD CONSTRAINT "external_link_author_fk" FOREIGN KEY ("organization_id", "created_by") REFERENCES "app_user"("organization_id", "id");
