ALTER TABLE "report" ADD COLUMN IF NOT EXISTS "plan_entries" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN IF NOT EXISTS "work_entries" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN IF NOT EXISTS "blockers" jsonb DEFAULT '[]'::jsonb NOT NULL;
