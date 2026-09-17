import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
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
export async function uploadUrl(key: string, contentType: string) {
  const config = storageConfig();
  return getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      ContentType: contentType,
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
  await client().send(
    new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }),
  );
}
