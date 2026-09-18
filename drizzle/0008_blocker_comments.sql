CREATE TABLE IF NOT EXISTS "blocker_comment" ("id" text PRIMARY KEY NOT NULL, "organization_id" text NOT NULL, "blocker_id" text NOT NULL, "author_id" text NOT NULL, "body" text NOT NULL, "deleted_at" timestamp with time zone, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL);
CREATE INDEX IF NOT EXISTS "blocker_comment_created" ON "blocker_comment" ("organization_id", "blocker_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "blocker_org_id" ON "blocker" ("organization_id", "id");
ALTER TABLE "blocker_comment" ADD CONSTRAINT "blocker_comment_blocker_fk" FOREIGN KEY ("organization_id", "blocker_id") REFERENCES "blocker"("organization_id", "id");
ALTER TABLE "blocker_comment" ADD CONSTRAINT "blocker_comment_author_fk" FOREIGN KEY ("organization_id", "author_id") REFERENCES "app_user"("organization_id", "id");
