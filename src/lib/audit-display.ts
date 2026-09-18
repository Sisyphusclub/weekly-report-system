const labels: Record<string, string> = {
  TASK_TRANSFER: "批量转交任务",
  OPS_TOTP_RESET: "运维重置双因素认证",
  PASSWORD_RESET: "重置密码",
  USER_DISABLED: "停用账号",
  USER_ENABLED: "启用账号",
  INITIAL_ADMIN_CREATED: "创建初始管理员",
};

export function auditActionLabel(action: string) {
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
