import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

async function main() {
  const env = process.env;
  if (env.APP_ENV !== "development")
    throw new Error("Development environment required");
  for (const key of [
    "S3_ENDPOINT",
    "S3_REGION",
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "ATTACHMENT_SCANNER_URL",
    "ATTACHMENT_SCANNER_TOKEN",
  ])
    if (!env[key])
      throw new Error("Storage and scanner configuration required");
  const client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
  });
  const prefix = `integration/${randomUUID()}`;
  const uploaded: string[] = [];
  async function scan(
    downloadUrl: string,
    sizeBytes: number,
    authorized = true,
  ) {
    return fetch(env.ATTACHMENT_SCANNER_URL!, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authorized
          ? { authorization: `Bearer ${env.ATTACHMENT_SCANNER_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ downloadUrl, sizeBytes }),
      signal: AbortSignal.timeout(25000),
    });
  }
  try {
    // EICAR is an inert antivirus test signature, never executed.
    const signature =
      "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
    for (const [name, content, clean] of [
      ["clean", "附件验证", true],
      ["eicar", signature, false],
    ] as const) {
      const Key = `${prefix}/${name}.txt`;
      const Body = Buffer.from(content);
      uploaded.push(Key);
      await client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key,
          Body,
          ContentType: "text/plain",
        }),
      );
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: env.S3_BUCKET, Key }),
        { expiresIn: 120 },
      );
      assert.equal((await scan(url, Body.length, false)).status, 401);
      const response = await scan(url, Body.length);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).clean, clean);
      if (clean) {
        const mismatch = await scan(url, Body.length + 1);
        assert.equal(mismatch.status, 503);
        assert.equal((await mismatch.json()).clean, false);
      }
    }
    const missing = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: `${prefix}/missing.txt`,
      }),
      { expiresIn: 120 },
    );
    const missingResponse = await scan(missing, 1);
    assert.equal(missingResponse.status, 503);
    assert.equal((await missingResponse.json()).clean, false);
  } finally {
    for (const Key of uploaded) {
      await client.send(
        new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key }),
      );
      await assert.rejects(
        client.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key })),
        (error: unknown) =>
          typeof error === "object" &&
          error !== null &&
          "$metadata" in error &&
          (error.$metadata as { httpStatusCode?: number }).httpStatusCode ===
            404,
      );
    }
    client.destroy();
  }
  console.log(
    "PASS: scanner authorization, clean object, EICAR rejection, size mismatch rejection, object cleanup",
  );
}
main().catch(() => {
  console.error(
    "Storage/scanner integration failed; credentials and signed URLs are not logged.",
  );
  process.exitCode = 1;
});
