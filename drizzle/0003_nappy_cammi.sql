CREATE TABLE "revision_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"report_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"base_version" integer NOT NULL,
	"reason" text NOT NULL,
	"proposed_changes" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"reviewer_id" text,
	"review_reason" text,
	"reviewed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revision_request_positive_versions" CHECK ("revision_request"."base_version" > 0 AND "revision_request"."version" > 0),
	CONSTRAINT "revision_request_review_state" CHECK (("revision_request"."status" = 'PENDING' AND "revision_request"."reviewer_id" IS NULL AND "revision_request"."reviewed_at" IS NULL) OR ("revision_request"."status" IN ('APPROVED', 'REJECTED') AND "revision_request"."reviewer_id" IS NOT NULL AND "revision_request"."reviewed_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "revision_request" ADD CONSTRAINT "revision_request_organization_id_report_id_report_organization_id_id_fk" FOREIGN KEY ("organization_id","report_id") REFERENCES "public"."report"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_request" ADD CONSTRAINT "revision_request_organization_id_requester_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","requester_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_request" ADD CONSTRAINT "revision_request_organization_id_reviewer_id_app_user_organization_id_id_fk" FOREIGN KEY ("organization_id","reviewer_id") REFERENCES "public"."app_user"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "revision_request_org_id" ON "revision_request" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "revision_request_pending_author" ON "revision_request" USING btree ("report_id","requester_id") WHERE "revision_request"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "revision_request_org_status_created" ON "revision_request" USING btree ("organization_id","status","created_at");