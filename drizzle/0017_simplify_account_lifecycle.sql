DROP TABLE IF EXISTS "auth_rate_limit" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "auth_two_factor" CASCADE;--> statement-breakpoint
UPDATE "app_user"
SET "status" = CASE
  WHEN "status" = 'DISABLED' THEN 'DISABLED'::"user_status"
  ELSE 'ACTIVE'::"user_status"
END;--> statement-breakpoint
ALTER TABLE "app_user" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "app_user" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::text;--> statement-breakpoint
DROP TYPE "public"."user_status";--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'DISABLED');--> statement-breakpoint
ALTER TABLE "app_user" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"public"."user_status";--> statement-breakpoint
ALTER TABLE "app_user" ALTER COLUMN "status" SET DATA TYPE "public"."user_status" USING "status"::"public"."user_status";--> statement-breakpoint
ALTER TABLE "app_user" DROP COLUMN IF EXISTS "must_change_password";--> statement-breakpoint
ALTER TABLE "app_user" DROP COLUMN IF EXISTS "two_factor_enabled";--> statement-breakpoint
ALTER TABLE "app_user" DROP COLUMN IF EXISTS "failed_login_count";--> statement-breakpoint
ALTER TABLE "app_user" DROP COLUMN IF EXISTS "login_locked_until";
