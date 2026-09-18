import { expect, it } from "vitest";
import { and } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { report } from "../src/lib/db/schema";
import {
  reportSearchConditions,
  reportVisibility,
  reportExportVisibility,
} from "../src/lib/reports";

it("binds member IDs and escapes wildcard searches without interpolating SQL", () => {
  const injection = "' OR 1=1 --";
  const query = new QueryBuilder()
    .select()
    .from(report)
    .where(
      reportSearchConditions("50%_\\", {
        member: injection,
        status: "SUBMITTED",
        type: "WEEKLY",
      }),
    )
    .toSQL();
  expect(query.sql).not.toContain(injection);
  expect(query.params).toEqual([
    injection,
    "SUBMITTED",
    "WEEKLY",
    "%50\\%\\_\\\\%",
  ]);
});
it("member and draft filters never replace tenant and author visibility", () => {
  const actor = {
    id: "self",
    organizationId: "tenant",
    role: "EMPLOYEE" as const,
  };
  for (const visibility of [reportVisibility, reportExportVisibility]) {
    const query = new QueryBuilder()
      .select()
      .from(report)
      .where(
        and(
          visibility(actor),
          reportSearchConditions("", { member: "other", status: "DRAFT" }),
        ),
      )
      .toSQL();
    expect(query.params).toContain("tenant");
    expect(query.params).toContain("self");
    expect(query.params).toContain("other");
    expect(query.params).toContain("DRAFT");
    expect(query.sql).toContain(" and ");
  }
});
