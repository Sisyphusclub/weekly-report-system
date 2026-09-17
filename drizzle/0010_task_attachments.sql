CREATE TABLE IF NOT EXISTS "task_attachment" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "task_id" text NOT NULL,
  "uploaded_by" text NOT NULL,
  "file_name" text NOT NULL,
  "content_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "object_key" text NOT NULL UNIQUE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "task_attachment_task_fk" FOREIGN KEY ("organization_id", "task_id") REFERENCES "work_task"("organization_id", "id"),
  CONSTRAINT "task_attachment_user_fk" FOREIGN KEY ("organization_id", "uploaded_by") REFERENCES "user"("organization_id", "id")
);
CREATE INDEX IF NOT EXISTS "task_attachment_task" ON "task_attachment" ("organization_id", "task_id");
