import type { RemoteDailyDraft } from "./daily-conflict";
export type DailyDraftContent = {
  summary: string;
  noWorkReason: string;
  noPlanReason: string;
  taskIds: string[];
};
type SaveResult = {
  id: string;
  version: number;
  status: "DRAFT" | "SUBMITTED";
};
export type DailyDraftState = {
  content: DailyDraftContent;
  version: number;
  id?: string;
  submitted: boolean;
  pending: boolean;
  dirty: boolean;
  paused: boolean;
  message: string;
};

/** One in-flight write per editor. Failed writes pause automatic retries. */
export class DailyDraftController {
  private state: DailyDraftState;
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setTimeout>;
  private active = false;
  constructor(
    initial: Pick<DailyDraftState, "content" | "version" | "id" | "submitted">,
    private write: (
      content: DailyDraftContent,
      version: number,
      submit: boolean,
    ) => Promise<SaveResult>,
  ) {
    this.state = {
      ...initial,
      pending: false,
      dirty: false,
      paused: false,
      message: "",
    };
  }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    this.active = true;
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        this.active = false;
        clearTimeout(this.timer);
      }
    };
  };
  private publish(patch: Partial<DailyDraftState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private schedule() {
    clearTimeout(this.timer);
    if (
      this.active &&
      this.state.dirty &&
      !this.state.paused &&
      !this.state.submitted &&
      !this.state.pending
    )
      this.timer = setTimeout(() => void this.save(false), 1000);
  }
  update(patch: Partial<DailyDraftContent>) {
    if (this.state.submitted) return;
    this.publish({
      content: { ...this.state.content, ...patch },
      dirty: true,
      message: this.state.paused ? this.state.message : "尚未同步",
    });
    this.schedule();
  }
  resolve(remote: RemoteDailyDraft, keepLocal: boolean) {
    if (this.state.pending || (keepLocal && remote.status === "SUBMITTED"))
      return false;
    clearTimeout(this.timer);
    this.publish({
      id: remote.id,
      version: remote.version,
      submitted: remote.status === "SUBMITTED",
      content: keepLocal
        ? this.state.content
        : {
            summary: remote.summary,
            noWorkReason: remote.noWorkReason,
            noPlanReason: remote.noPlanReason,
            taskIds: remote.taskIds,
          },
      dirty: keepLocal,
      paused: false,
      message: keepLocal ? "本地内容尚未同步" : "已载入远端内容",
    });
    return true;
  }
  async save(submit: boolean) {
    if (this.state.pending || this.state.submitted) return false;
    clearTimeout(this.timer);
    const sent = structuredClone(this.state.content);
    this.publish({
      pending: true,
      message: submit ? "正在提交…" : "正在保存…",
    });
    try {
      const result = await this.write(sent, this.state.version, submit);
      const dirty = JSON.stringify(sent) !== JSON.stringify(this.state.content);
      this.publish({
        id: result.id,
        version: result.version,
        submitted: result.status === "SUBMITTED",
        dirty,
        paused: false,
        message:
          result.status === "SUBMITTED"
            ? "日报已提交"
            : dirty
              ? "尚未同步"
              : "草稿已保存",
      });
      return true;
    } catch (error) {
      this.publish({
        paused: true,
        dirty: true,
        message:
          error instanceof Error ? error.message : "保存失败，请保留内容并重试",
      });
      return false;
    } finally {
      this.publish({ pending: false });
      this.schedule();
    }
  }
}
