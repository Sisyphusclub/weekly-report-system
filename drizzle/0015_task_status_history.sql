CREATE TABLE IF NOT EXISTS "task_status_history" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "task_id" text NOT NULL,
  "from_status" "task_status",
  "to_status" "task_status" NOT NULL,
  "changed_by_id" text NOT NULL,
  "changed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "task_status_history_task_fk" FOREIGN KEY ("organization_id","task_id") REFERENCES "work_task"("organization_id","id"),
  CONSTRAINT "task_status_history_user_fk" FOREIGN KEY ("organization_id","changed_by_id") REFERENCES "app_user"("organization_id","id")
);
CREATE INDEX IF NOT EXISTS "task_status_history_task" ON "task_status_history" ("organization_id","task_id","changed_at");
CREATE OR REPLACE FUNCTION reject_task_status_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Historical records are append-only'; END; $$;
DROP TRIGGER IF EXISTS task_status_history_immutable_update ON "task_status_history";
DROP TRIGGER IF EXISTS task_status_history_immutable_delete ON "task_status_history";
CREATE TRIGGER task_status_history_immutable_update BEFORE UPDATE ON "task_status_history" FOR EACH ROW EXECUTE FUNCTION reject_task_status_history_mutation();
CREATE TRIGGER task_status_history_immutable_delete BEFORE DELETE ON "task_status_history" FOR EACH ROW EXECUTE FUNCTION reject_task_status_history_mutation();
