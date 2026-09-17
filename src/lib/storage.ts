import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getConfig } from "./config";

export function storageConfig() {
  const config = getConfig();
  if (
    !config.S3_ENDPOINT ||
    !config.S3_REGION ||
    !config.S3_BUCKET ||
    !config.S3_ACCESS_KEY_ID ||
    !config.S3_SECRET_ACCESS_KEY
  )
    throw new Error("附件存储未配置");
  return config;
}
function client() {
  const config = storageConfig();
  return new S3Client({
    endpoint: config.S3_ENDPOINT!,
    region: config.S3_REGION!,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY_ID!,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY!,
    },
  });
}
export async function uploadUrl(
  key: string,
  contentType: string,
  checksumSha256: string,
) {
  const config = storageConfig();
  return getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ChecksumSHA256: checksumSha256,
    }),
    { expiresIn: 600 },
  );
}
export async function downloadUrl(key: string, fileName: string) {
  const config = storageConfig();
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    }),
    { expiresIn: 600 },
  );
}
export async function deleteObject(key: string) {
  const config = storageConfig();
  try {
    await client().send(
      new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }),
    );
  } catch (error) {
    if (error instanceof Error && "name" in error && error.name === "NoSuchKey")
      return;
    throw error;
  }
}
export async function verifyObject(
  key: string,
  sizeBytes: number,
  checksumSha256: string,
  contentType: string,
) {
  const config = storageConfig();
  const result = await client().send(
    new HeadObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      ChecksumMode: "ENABLED",
    }),
  );
  if (result.ContentLength !== sizeBytes) throw new Error("附件大小校验失败");
  if (!result.ChecksumSHA256) throw new Error("对象存储未返回附件校验和");
  if (result.ChecksumSHA256 !== checksumSha256)
    throw new Error("附件哈希校验失败");
  const object = await client().send(
    new GetObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      Range: "bytes=0-15",
    }),
  );
  const bytes = object.Body
    ? new Uint8Array(await object.Body.transformToByteArray())
    : new Uint8Array();
  const ascii = String.fromCharCode(...bytes);
  const valid =
    contentType === "application/pdf"
      ? ascii.startsWith("%PDF-")
      : contentType === "image/png"
        ? bytes
            .slice(0, 8)
            .every(
              (value, index) =>
                value === [137, 80, 78, 71, 13, 10, 26, 10][index],
            )
        : contentType === "image/jpeg"
          ? bytes[0] === 255 && bytes[1] === 216
          : contentType === "image/webp"
            ? ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP"
            : !bytes.includes(0) &&
              !ascii.startsWith("MZ") &&
              !ascii.startsWith("\u007fELF") &&
              !ascii.startsWith("#!");
  if (!valid) throw new Error("附件内容与类型不匹配");
}
export async function checkStorage() {
  const config = storageConfig();
  await client().send(new HeadBucketCommand({ Bucket: config.S3_BUCKET }));
}
