import { reportSnapshot, reportSummaryDiff } from "@/lib/report-snapshot";

export function ReportSnapshotView({
  snapshot,
  diff,
}: {
  snapshot: unknown;
  diff: unknown;
}) {
  const parsed = reportSnapshot.safeParse(snapshot);
  const changes = reportSummaryDiff.safeParse(diff);
  if (!parsed.success)
    return <p role="alert">此版本快照无法读取，请联系管理员核查。</p>;
  const data = parsed.data;
  return (
    <div className="flex flex-col gap-6">
      {changes.success && changes.data.summary && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-medium leading-7">总结变更</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium leading-5">修订前</h3>
              <p className="mt-2 whitespace-pre-wrap break-words">
                {changes.data.summary[0] || "未填写总结"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium leading-5">修订后</h3>
              <p className="mt-2 whitespace-pre-wrap break-words">
                {changes.data.summary[1] || "未填写总结"}
              </p>
            </div>
          </div>
        </section>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium leading-7">版本内容</h2>
        <p className="whitespace-pre-wrap break-words">
          {data.summary || "未填写总结"}
        </p>
        {data.noWorkReason && <p>无工作原因：{data.noWorkReason}</p>}
        {data.noPlanReason && <p>无计划原因：{data.noPlanReason}</p>}
      </section>
      <section>
        <h2 className="text-xl font-medium leading-7">任务与交付物</h2>
        {!data.tasks.length && (
          <p className="mt-3 text-slate-500">未关联任务</p>
        )}
        <ul className="mt-3 divide-y divide-separator-border">
          {data.tasks.map((task, index) => (
            <li key={index} className="flex flex-col gap-2 py-4">
              <p className="whitespace-pre-wrap break-words">{task.content}</p>
              <p className="text-slate-500">
                {task.kind === "PLAN" ? "计划" : "实际工作"} ·{" "}
                {task.categoryName} ·{" "}
                {
                  {
                    TODO: "待开始",
                    IN_PROGRESS: "进行中",
                    BLOCKED: "阻塞",
                    DONE: "完成",
                    CANCELED: "已取消",
                  }[task.status]
                }
                {task.dueDate ? ` · 截止 ${task.dueDate}` : ""}
              </p>
              <ul className="flex flex-wrap gap-3" aria-label="交付物">
                {task.deliverables.map((delivery) => (
                  <li key={delivery.unitId}>
                    {delivery.quantity} {delivery.unitName}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
