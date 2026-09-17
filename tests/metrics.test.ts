import { expect, it } from "vitest";
import { submissionRate } from "../src/lib/metrics";
it("按统一口径计算提交率", () => {
  expect(submissionRate(4, 5)).toBe(80);
  expect(submissionRate(0, 0)).toBeNull();
});
