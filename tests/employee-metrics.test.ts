import { describe, expect, it } from "vitest";
import { employeeDailyMetrics } from "../src/lib/employee-metrics";

describe("员工工作台指标", () => {
  it("按实际完成来源链路计算计划兑现率", () => {
    expect(
      employeeDailyMetrics([
        { id: "plan-1", kind: "PLAN", status: "TODO", sourceTaskId: null },
        { id: "plan-2", kind: "PLAN", status: "DONE", sourceTaskId: null },
        {
          id: "actual-1",
          kind: "ACTUAL",
          status: "DONE",
          sourceTaskId: "plan-1",
        },
        {
          id: "actual-2",
          kind: "ACTUAL",
          status: "IN_PROGRESS",
          sourceTaskId: null,
        },
      ]),
    ).toEqual({
      planCount: 2,
      completedCount: 1,
      completedPlans: 2,
      fulfillmentRate: 100,
    });
  });

  it("没有计划时兑现率为零，不产生 NaN", () => {
    expect(
      employeeDailyMetrics([
        { id: "actual-1", kind: "ACTUAL", status: "DONE", sourceTaskId: null },
      ]),
    ).toEqual({
      planCount: 0,
      completedCount: 1,
      completedPlans: 0,
      fulfillmentRate: 0,
    });
  });
});
