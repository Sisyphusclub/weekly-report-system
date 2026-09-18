import { beforeEach, expect, it, vi } from "vitest";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { resetTotp, resetTotpInput } from "../scripts/reset-totp-service";
import { auditLog, session, twoFactor } from "../src/lib/db/schema";

const input = {
  organizationId: "org",
  operatorUsername: "admin",
  targetUsername: "boss",
  reason: "设备丢失且恢复码无法找回，已核实本人身份",
  confirm: "RESET_TOTP",
};
let accounts: Array<Record<string, unknown>>;
let factors: { id: string }[];
let deletes: unknown[];
const update = vi.fn();
const audit = vi.fn();
const transaction = vi.fn();
function database() {
  const query = {
    from: () => query,
    where: () => query,
    orderBy: () => query,
    for: async () => accounts,
  };
  const tx = {
    select: () => query,
    delete: (table: unknown) => ({
      where: () => {
        deletes.push(table);
        return table === twoFactor
          ? { returning: async () => factors }
          : Promise.resolve();
      },
    }),
    update: () => ({
      set: (value: unknown) => ({ where: async () => update(value) }),
    }),
    insert: (table: unknown) => ({
      values: async (value: unknown) => audit(table, value),
    }),
  };
  transaction.mockImplementation((action) => action(tx));
  return { transaction } as unknown as NodePgDatabase;
}
beforeEach(() => {
  vi.clearAllMocks();
  accounts = [
    { id: "operator", username: "admin", role: "ADMIN", status: "ACTIVE" },
    {
      id: "target",
      username: "boss",
      role: "BOSS",
      status: "ACTIVE",
      twoFactorEnabled: true,
    },
  ];
  factors = [{ id: "factor" }];
  deletes = [];
});
it("requires explicit confirmation and a meaningful recovery reason", () => {
  expect(
    resetTotpInput.safeParse({ ...input, confirm: undefined }).success,
  ).toBe(false);
  expect(resetTotpInput.safeParse({ ...input, reason: " " }).success).toBe(
    false,
  );
});
it("revokes factors and sessions and records operator and reason in one transaction", async () => {
  await resetTotp(database(), input);
  expect(transaction).toHaveBeenCalledOnce();
  expect(deletes).toEqual([twoFactor, session]);
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({
      twoFactorEnabled: false,
      mustChangePassword: true,
      status: "PENDING",
      loginLockedUntil: null,
    }),
  );
  expect(audit).toHaveBeenCalledWith(
    auditLog,
    expect.objectContaining({
      actorId: "operator",
      resourceId: "target",
      action: "OPS_TOTP_RESET",
      reason: input.reason,
    }),
  );
});
it("does not enable a disabled target", async () => {
  accounts[1].status = "DISABLED";
  await resetTotp(database(), input);
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ status: "DISABLED" }),
  );
});
it.each(["EMPLOYEE", "BOSS"])(
  "rejects a %s operator before any mutation",
  async (role) => {
    accounts[0].role = role;
    await expect(resetTotp(database(), input)).rejects.toThrow(
      "OPERATOR_NOT_AVAILABLE",
    );
    expect(deletes).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  },
);
it("rejects an unavailable target before mutations", async () => {
  accounts.pop();
  await expect(resetTotp(database(), input)).rejects.toThrow(
    "TARGET_NOT_FOUND",
  );
  expect(deletes).toEqual([]);
});
it("rejects an account without a configured factor", async () => {
  accounts[1].twoFactorEnabled = false;
  factors = [];
  await expect(resetTotp(database(), input)).rejects.toThrow(
    "TOTP_NOT_CONFIGURED",
  );
  expect(update).not.toHaveBeenCalled();
  expect(audit).not.toHaveBeenCalled();
});
it("propagates audit failure so the database transaction rolls back", async () => {
  audit.mockRejectedValueOnce(new Error("audit unavailable"));
  await expect(resetTotp(database(), input)).rejects.toThrow(
    "audit unavailable",
  );
});
