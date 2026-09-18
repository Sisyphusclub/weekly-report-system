const labels: Record<string, string> = {
  ORGANIZATION_SETTINGS_UPDATE: "修改系统设置",
  TASK_CREATE: "创建任务",
  TASK_UPDATE: "修改任务",
  TASK_IMPORT: "导入任务",
  TASK_EXPORT: "导出任务",
  PLAN_ROLL: "结转计划",
  REPORT_SUBMIT: "提交日报",
  REPORT_SAVE: "保存日报草稿",
  WEEKLY_REPORT_SUBMIT: "提交周报",
  WEEKLY_REPORT_SAVE: "保存周报草稿",
  REPORT_REVISE: "修订报告",
  REPORT_EXPORT: "导出报告",
  REVISION_REQUEST_CREATE: "申请修订报告",
  REVISION_APPROVED: "批准报告修订",
  REVISION_REJECTED: "拒绝报告修订",
  BLOCKER_CREATE: "创建阻塞",
  BLOCKER_ASSIGN: "分派阻塞",
  BLOCKER_ACKNOWLEDGE: "确认阻塞",
  BLOCKER_RESOLVE: "解决阻塞",
  BLOCKER_COMMENT_CREATE: "评论阻塞",
  BLOCKER_COMMENT_UPDATE: "修改阻塞评论",
  BLOCKER_COMMENT_DELETE: "删除阻塞评论",
  TASK_COMMENT_CREATE: "评论任务",
  TASK_COMMENT_UPDATE: "修改任务评论",
  TASK_COMMENT_DELETE: "删除任务评论",
  DELIVERABLE_CREATE: "添加交付物",
  DELIVERABLE_UPDATE: "修改交付物",
  EXTERNAL_LINK_CREATE: "添加任务链接",
  ATTACHMENT_UPLOAD_INIT: "开始上传附件",
  ATTACHMENT_VERIFY: "确认附件上传",
  ATTACHMENT_DELETE: "删除附件",
  TASK_TRANSFER: "批量转交任务",
  OPS_TOTP_RESET: "运维重置双因素认证",
  PASSWORD_RESET: "重置密码",
  USER_DISABLED: "停用账号",
  USER_ENABLED: "启用账号",
  INITIAL_ADMIN_CREATED: "创建初始管理员",
};

export function auditActionLabel(action: string) {
  const transition =
    /^TASK_STATUS_(TODO|IN_PROGRESS|BLOCKED|DONE|CANCELED)_TO_(TODO|IN_PROGRESS|BLOCKED|DONE|CANCELED)$/.exec(
      action,
    );
  if (transition) {
    const statuses: Record<string, string> = {
      TODO: "待开始",
      IN_PROGRESS: "进行中",
      BLOCKED: "阻塞",
      DONE: "已完成",
      CANCELED: "已取消",
    };
    return `任务状态：${statuses[transition[1]]} → ${statuses[transition[2]]}`;
  }
  return labels[action] ?? action;
}

export function auditReasonDetails(action: string, reason: string | null) {
  if (!reason) return [];
  if (action === "TASK_TRANSFER") {
    try {
      const value: unknown = JSON.parse(reason);
      if (
        value &&
        typeof value === "object" &&
        "fromId" in value &&
        typeof value.fromId === "string" &&
        "toId" in value &&
        typeof value.toId === "string" &&
        "reason" in value &&
        typeof value.reason === "string"
      ) {
        return [
          { label: "原负责人 ID", value: value.fromId },
          { label: "接收人 ID", value: value.toId },
          { label: "转交原因", value: value.reason },
        ];
      }
    } catch {
      // Older or malformed records remain readable as plain text.
    }
  }
  return [{ label: "操作原因", value: reason }];
}
