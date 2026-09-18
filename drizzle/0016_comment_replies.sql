ALTER TABLE "task_comment" ADD COLUMN IF NOT EXISTS "parent_id" text;
ALTER TABLE "blocker_comment" ADD COLUMN IF NOT EXISTS "parent_id" text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_comment_parent_fk') THEN
    ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_parent_fk" FOREIGN KEY ("organization_id","parent_id") REFERENCES "task_comment"("organization_id","id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blocker_comment_parent_fk') THEN
    ALTER TABLE "blocker_comment" ADD CONSTRAINT "blocker_comment_parent_fk" FOREIGN KEY ("organization_id","parent_id") REFERENCES "blocker_comment"("organization_id","id");
  END IF;
END $$;
