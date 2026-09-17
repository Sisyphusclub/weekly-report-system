CREATE FUNCTION prevent_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Historical records are append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER report_revision_immutable
BEFORE UPDATE OR DELETE ON report_revision
FOR EACH ROW EXECUTE FUNCTION prevent_history_mutation();
--> statement-breakpoint
CREATE TRIGGER report_revision_no_truncate
BEFORE TRUNCATE ON report_revision
FOR EACH STATEMENT EXECUTE FUNCTION prevent_history_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_log_immutable
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_history_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate
BEFORE TRUNCATE ON audit_log
FOR EACH STATEMENT EXECUTE FUNCTION prevent_history_mutation();
