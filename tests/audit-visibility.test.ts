import { expect, it } from "vitest";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { businessAuditVisibility } from "../src/lib/audit-visibility";
import { auditLog } from "../src/lib/db/schema";
import type { Role } from "../src/lib/domain";

function query(role: Role) {
  return new QueryBuilder()
    .select()
    .from(auditLog)
    .where(
      businessAuditVisibility({ id: "boss", organizationId: "tenant", role }),
    )
    .toSQL();
}
it.each(["ADMIN", "EMPLOYEE"] as const)(
  "denies %s at the query boundary",
  (role) => {
    expect(query(role).sql).toMatch(/where false$/);
  },
);
it("binds tenant and report visibility and excludes security and batch pseudo-resources", () => {
  const { sql, params } = query("BOSS");
  expect(sql).toContain('"audit_log"."organization_id" =');
  expect(sql).toContain('"report"."status" =');
  expect(sql).toContain('"report"."author_id" =');
  expect(params).toContain("SUBMITTED");
  expect(params).toContain("boss");
  expect(params).toContain("tenant");
  for (const forbidden of [
    "USER",
    "FILTER",
    "BATCH",
    "REPORT_SAVE",
    "WEEKLY_REPORT_SAVE",
  ]) {
    expect(params).not.toContain(forbidden);
  }
  for (const table of [
    "work_task",
    "blocker",
    "report",
    "revision_request",
    "task_attachment",
    "task_comment",
    "deliverable",
  ]) {
    expect(sql).toContain(`"${table}"."organization_id" =`);
  }
});
