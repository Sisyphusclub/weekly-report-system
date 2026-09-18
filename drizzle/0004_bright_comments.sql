CREATE TABLE IF NOT EXISTS "comment" (
  "id" text PRIMARY KEY NOT NULL, "organization_id" text NOT NULL, "report_id" text NOT NULL, "author_id" text NOT NULL, "parent_id" text,
  "body" text NOT NULL, "mentions" jsonb DEFAULT '[]'::jsonb NOT NULL, "edited_at" timestamp with time zone, "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "comment_organization_id_id_unique" UNIQUE ("organization_id","id")
);
CREATE INDEX IF NOT EXISTS "comment_report_created" ON "comment" ("organization_id","report_id","created_at");
ALTER TABLE "comment" ADD CONSTRAINT "comment_report_fk" FOREIGN KEY ("organization_id","report_id") REFERENCES "report"("organization_id","id");
ALTER TABLE "comment" ADD CONSTRAINT "comment_author_fk" FOREIGN KEY ("organization_id","author_id") REFERENCES "app_user"("organization_id","id");
ALTER TABLE "comment" ADD CONSTRAINT "comment_parent_fk" FOREIGN KEY ("organization_id","parent_id") REFERENCES "comment"("organization_id","id");
