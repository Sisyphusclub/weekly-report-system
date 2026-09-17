import { expect, it } from "vitest";
import { sourceReferences, updatedSources } from "../src/lib/source-updates";
it("只提示可见且版本变化的来源", () => {
  const snapshot = {
    sourceReports: [
      { id: "a", version: 1 },
      { id: "b", version: 2 },
      { id: "hidden", version: 1 },
    ],
  };
  expect(
    updatedSources(snapshot, [
      { id: "a", version: 3 },
      { id: "b", version: 2 },
    ]),
  ).toEqual(["a"]);
  expect(snapshot.sourceReports[0].version).toBe(1);
});
it("兼容没有来源版本的旧快照", () => {
  expect(sourceReferences({ sourceDates: ["2026-09-18"] })).toEqual([]);
  expect(sourceReferences(null)).toEqual([]);
});
