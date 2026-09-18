import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import * as schema from "../src/lib/db/schema";

async function main() {
  // Never fall back to the application database. Use a dedicated disposable DB.
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString || process.env.APP_ENV === "production")
    throw new Error("Set TEST_DATABASE_URL for an isolated test database");
  const url = new URL(connectionString);
  if (!decodeURIComponent(url.pathname).endsWith("_test"))
    throw new Error("Test database name must end in _test");
  const pool = new Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 5000,
  });
  const db = drizzle(pool);
  try {
    const migrationOptions = {
      migrationsFolder: fileURLToPath(new URL("../drizzle/", import.meta.url)),
    };
    await migrate(db, migrationOptions);
    console.log("Migration applied; checking replay and schema compatibility.");
    const first = await pool.query(
      "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
    );
    await migrate(db, migrationOptions);
    const second = await pool.query(
      "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
    );
    assert.deepEqual(
      second.rows,
      first.rows,
      "Repeated migration changed the journal",
    );
    const journal = JSON.parse(
      await readFile(
        new URL("../drizzle/meta/_journal.json", import.meta.url),
        "utf8",
      ),
    );
    assert.equal(first.rowCount, journal.entries.length);
    for (const table of Object.values(schema)) {
      if (is(table, PgTable)) await db.select().from(table).limit(0);
    }

    const ids = Array.from({ length: 6 }, () => randomUUID());
    console.log(
      "Schema reads passed; checking tenant constraints and concurrent updates.",
    );
    const [org, otherOrg, member, project, category, task] = ids;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO organization (id,name) VALUES ($1,'integration'),($2,'integration other')",
        [org, otherOrg],
      );
      await client.query(
        "INSERT INTO app_user (id,organization_id,name,email,username) VALUES ($1,$2,'test',$3,$4)",
        [member, org, `${member}@test.invalid`, member],
      );
      await client.query(
        "INSERT INTO project (id,organization_id,name,owner_id) VALUES ($1,$2,'test',$3)",
        [project, org, member],
      );
      await client.query(
        "INSERT INTO category (id,organization_id,name) VALUES ($1,$2,'test')",
        [category, org],
      );
      await client.query("SAVEPOINT tenant_check");
      await assert.rejects(
        client.query(
          "INSERT INTO project (id,organization_id,name,owner_id) VALUES ($1,$2,'invalid',$3)",
          [randomUUID(), otherOrg, member],
        ),
        { code: "23503" },
      );
      await client.query("ROLLBACK TO SAVEPOINT tenant_check");
      await client.query(
        "INSERT INTO work_task (id,organization_id,created_by_id,primary_assignee_id,project_id,category_id,category_name,content,kind,work_date) VALUES ($1,$2,$3,$3,$4,$5,'test','initial','ACTUAL','2026-09-18')",
        [task, org, member, project, category],
      );
      await client.query("COMMIT");
      // Separate pool connections compete for the same optimistic version.
      const results = await Promise.all(
        ["first", "second"].map((content) =>
          pool.query(
            "UPDATE work_task SET content=$1, version=version+1 WHERE id=$2 AND organization_id=$3 AND version=1 RETURNING version",
            [content, task, org],
          ),
        ),
      );
      assert.equal(
        results.reduce((total, result) => total + (result.rowCount ?? 0), 0),
        1,
      );
      const saved = await pool.query(
        "SELECT version FROM work_task WHERE id=$1",
        [task],
      );
      assert.equal(saved.rows[0].version, 2);
      console.log(
        "PASS: migration replay, schema columns, tenant foreign keys, concurrent optimistic update",
      );
    } finally {
      try {
        await client.query("ROLLBACK");
        // Delete only this run's UUID fixtures, never truncate shared tables.
        await client.query("BEGIN");
        await client.query("DELETE FROM work_task WHERE id=$1", [task]);
        await client.query("DELETE FROM project WHERE id=$1", [project]);
        await client.query("DELETE FROM category WHERE id=$1", [category]);
        await client.query("DELETE FROM app_user WHERE id=$1", [member]);
        await client.query(
          "DELETE FROM organization WHERE id=ANY($1::text[])",
          [[org, otherOrg]],
        );
        await client.query("COMMIT");
      } finally {
        client.release(true);
      }
    }
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Database integration failed. Use an isolated *_test database and inspect the test stage; credentials are not logged.",
  );
  process.exitCode = 1;
});
