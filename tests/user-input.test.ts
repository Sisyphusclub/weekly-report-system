import { expect, it } from "vitest";
import { createUserInput } from "../src/lib/user-input";
it("规范化用户名并拒绝客户端注入安全属性", () => {
  const input = {
    username: "Alice",
    name: "小林",
    role: "EMPLOYEE",
    password: "StrongPassword2026!",
  };
  expect(createUserInput.parse(input).username).toBe("alice");
  expect(
    createUserInput.safeParse({ ...input, organizationId: "other" }).success,
  ).toBe(false);
  expect(
    createUserInput.safeParse({ ...input, status: "ACTIVE" }).success,
  ).toBe(false);
});
it("拒绝不合法用户名和角色", () => {
  expect(
    createUserInput.safeParse({
      username: "a b",
      name: "小林",
      role: "EMPLOYEE",
      password: "StrongPassword2026!",
    }).success,
  ).toBe(false);
  expect(
    createUserInput.safeParse({
      username: "alice",
      name: "小林",
      role: "ROOT",
      password: "StrongPassword2026!",
    }).success,
  ).toBe(false);
});
it("要求管理员设置 12–128 位正式密码", () => {
  const input = { username: "alice", name: "小林", role: "EMPLOYEE" };
  expect(createUserInput.safeParse(input).success).toBe(false);
  expect(
    createUserInput.safeParse({ ...input, password: "short" }).success,
  ).toBe(false);
  expect(
    createUserInput.safeParse({ ...input, password: "x".repeat(129) }).success,
  ).toBe(false);
});
