import { afterEach, expect, it, vi } from "vitest";
import { DailyDraftController } from "@/lib/daily-draft-controller";
const initial = {
  content: { summary: "", noWorkReason: "", noPlanReason: "", taskIds: [] },
  version: 0,
  submitted: false,
};
afterEach(() => vi.useRealTimers());
it("核对冲突后以远端版本保存本地内容，禁止覆盖已提交报告", async () => {
  const write = vi
    .fn()
    .mockResolvedValue({ id: "report", version: 5, status: "DRAFT" });
  const controller = new DailyDraftController(initial, write);
  controller.update({ summary: "本地合并结果" });
  const remote = {
    id: "report",
    version: 4,
    status: "DRAFT" as const,
    summary: "远端内容",
    noWorkReason: "培训",
    noPlanReason: "请假",
    taskIds: ["task"],
  };
  expect(controller.resolve(remote, true)).toBe(true);
  await controller.save(false);
  expect(write).toHaveBeenCalledWith(
    expect.objectContaining({ summary: "本地合并结果" }),
    4,
    false,
  );
  expect(controller.resolve({ ...remote, status: "SUBMITTED" }, true)).toBe(
    false,
  );
  expect(controller.resolve({ ...remote, status: "SUBMITTED" }, false)).toBe(
    true,
  );
  expect(controller.snapshot()).toMatchObject({
    submitted: true,
    dirty: false,
    content: { summary: "远端内容", taskIds: ["task"] },
  });
});
it("停止输入一秒后保存最新内容", async () => {
  vi.useFakeTimers();
  const write = vi
    .fn()
    .mockResolvedValue({ id: "report", version: 1, status: "DRAFT" });
  const controller = new DailyDraftController(initial, write);
  const dispose = controller.subscribe(() => undefined);
  controller.update({ summary: "初稿" });
  await vi.advanceTimersByTimeAsync(600);
  controller.update({ summary: "完整总结" });
  await vi.advanceTimersByTimeAsync(999);
  expect(write).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(write).toHaveBeenCalledWith(
    expect.objectContaining({ summary: "完整总结" }),
    0,
    false,
  );
  expect(controller.snapshot()).toMatchObject({ version: 1, dirty: false });
  dispose();
});
it("保存过程中继续编辑，等前次成功后使用新版本串行保存", async () => {
  vi.useFakeTimers();
  let resolve!: (value: {
    id: string;
    version: number;
    status: "DRAFT";
  }) => void;
  const write = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    )
    .mockResolvedValue({ id: "report", version: 2, status: "DRAFT" });
  const controller = new DailyDraftController(initial, write);
  const dispose = controller.subscribe(() => undefined);
  controller.update({ summary: "第一版" });
  await vi.advanceTimersByTimeAsync(1000);
  controller.update({ summary: "第二版" });
  await vi.advanceTimersByTimeAsync(2000);
  expect(write).toHaveBeenCalledTimes(1);
  resolve({ id: "report", version: 1, status: "DRAFT" });
  await vi.advanceTimersByTimeAsync(1000);
  expect(write).toHaveBeenLastCalledWith(
    expect.objectContaining({ summary: "第二版" }),
    1,
    false,
  );
  expect(controller.snapshot().dirty).toBe(false);
  dispose();
});
it("冲突或网络失败保留内容并暂停自动重试", async () => {
  vi.useFakeTimers();
  const write = vi.fn().mockRejectedValue(new Error("版本冲突"));
  const controller = new DailyDraftController(initial, write);
  const dispose = controller.subscribe(() => undefined);
  controller.update({ summary: "未同步内容" });
  await vi.advanceTimersByTimeAsync(1000);
  controller.update({ noWorkReason: "培训" });
  await vi.advanceTimersByTimeAsync(10000);
  expect(write).toHaveBeenCalledTimes(1);
  expect(controller.snapshot()).toMatchObject({
    paused: true,
    dirty: true,
    content: { summary: "未同步内容", noWorkReason: "培训" },
  });
  dispose();
});
it("提交时取消待触发自动保存，成功后不可再编辑", async () => {
  vi.useFakeTimers();
  const write = vi
    .fn()
    .mockResolvedValue({ id: "report", version: 1, status: "SUBMITTED" });
  const controller = new DailyDraftController(initial, write);
  const dispose = controller.subscribe(() => undefined);
  controller.update({ summary: "总结" });
  await controller.save(true);
  controller.update({ summary: "覆盖" });
  await vi.advanceTimersByTimeAsync(5000);
  expect(write).toHaveBeenCalledTimes(1);
  expect(controller.snapshot()).toMatchObject({
    submitted: true,
    content: { summary: "总结" },
  });
  dispose();
});
