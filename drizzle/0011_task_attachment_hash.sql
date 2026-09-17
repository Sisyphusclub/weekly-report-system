ALTER TABLE "task_attachment" ADD COLUMN IF NOT EXISTS "sha256" text;
UPDATE "task_attachment" SET "sha256" = repeat('0', 64) WHERE "sha256" IS NULL;
ALTER TABLE "task_attachment" ALTER COLUMN "sha256" SET NOT NULL;
