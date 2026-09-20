import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { getAuth } from "../src/lib/auth";
import { getPool, closePool } from "../src/lib/db";

async function main() {
  const target = process.env.TEST_DATABASE_URL;
  if (!target || process.env.APP_ENV === "production")
    throw new Error("An isolated test database is required");
  if (!new URL(target).pathname.endsWith("_test"))
    throw new Error("Database name must end in _test");
  process.env.DATABASE_URL = target;
  const pool = getPool();
  const id = randomUUID();
  const org = randomUUID();
  const username = `test_${id.replaceAll("-", "").slice(0, 20)}`;
  let password = randomUUID();
  const origin = process.env.BETTER_AUTH_URL!;
  const auth = getAuth();
  let cookie = "";
  async function request(path: string, body?: object) {
    const response = await auth.handler(
      new Request(`${origin}/api/auth/${path}`, {
        method: body ? "POST" : "GET",
        headers: { origin, "content-type": "application/json", cookie },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
    const cookies = response.headers.getSetCookie();
    if (cookies.length)
      cookie = cookies.map((value) => value.split(";")[0]).join("; ");
    return response;
  }
  try {
    await pool.query(
      "INSERT INTO organization(id,name) VALUES($1,'auth integration')",
      [org],
    );
    await pool.query(
      "INSERT INTO app_user(id,organization_id,name,email,username,status) VALUES($1,$2,'integration',$3,$4,'ACTIVE')",
      [id, org, `${id}@test.invalid`, username],
    );
    await pool.query(
      "INSERT INTO auth_account(id,account_id,provider_id,user_id,password) VALUES($1,$1,'credential',$1,$2)",
      [id, await hashPassword(password)],
    );
    assert.equal(
      (await request("sign-in/username", { username, password: randomUUID() }))
        .status,
      401,
    );
    assert.equal(
      (await request("sign-in/username", { username, password })).status,
      200,
    );
    const session = await (await request("get-session")).json();
    assert.equal(session.user.id, id);
    assert.equal(session.user.organizationId, org);
    const firstDevice = cookie;
    cookie = "";
    assert.equal(
      (await request("sign-in/username", { username, password })).status,
      200,
    );
    assert.equal(
      (
        await request("change-password", {
          currentPassword: password,
          newPassword: password,
        })
      ).status,
      400,
    );
    const oldPassword = password;
    password = randomUUID();
    assert.equal(
      (
        await request("change-password", {
          currentPassword: oldPassword,
          newPassword: password,
        })
      ).status,
      200,
    );
    const currentDevice = cookie;
    cookie = firstDevice;
    assert.equal(await (await request("get-session")).json(), null);
    cookie = currentDevice;
    assert.equal((await (await request("get-session")).json()).user.id, id);
    assert.equal((await request("sign-out", {})).status, 200);
    assert.equal(await (await request("get-session")).json(), null);
    assert.equal(
      (await request("sign-in/username", { username, password: oldPassword }))
        .status,
      401,
    );
    const audit = await pool.query(
      "SELECT count(*)::int AS count FROM audit_log WHERE actor_id=$1 AND action='PASSWORD_CHANGED'",
      [id],
    );
    assert.equal(audit.rows[0].count, 1);
    assert.equal(
      (await request("sign-in/username", { username, password })).status,
      200,
    );
    assert.equal((await request("sign-out", {})).status, 200);
    await pool.query("UPDATE app_user SET status='DISABLED' WHERE id=$1", [id]);
    assert.equal(
      (await request("sign-in/username", { username, password })).status,
      401,
    );
    console.log(
      "PASS: login, password change, session revocation, password audit, logout, disabled account",
    );
  } finally {
    await pool.query("DELETE FROM auth_session WHERE user_id=$1", [id]);
    await pool.query("DELETE FROM auth_account WHERE user_id=$1", [id]);
    // Preserve append-only audit records and their referenced identities.
    // Run in a disposable database; the runner removes that database afterwards.
    await closePool();
  }
}
main().catch((error: unknown) => {
  if (error instanceof assert.AssertionError)
    console.error(
      "Assertion failed at",
      error.stack?.split("\n").find((line) => line.includes("test-auth.ts:")),
    );
  console.error(
    "Authentication integration failed; credentials are not logged.",
  );
  process.exitCode = 1;
});
