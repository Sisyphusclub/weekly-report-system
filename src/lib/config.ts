import { z } from "zod";

const schema = z
  .object({
    DATABASE_URL: z
      .string()
      .url()
      .refine((value) => /^postgres(ql)?:\/\//.test(value)),
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    APP_ENV: z.enum(["development", "staging", "production"]),
    S3_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().min(1).optional(),
    S3_BUCKET: z.string().min(1).optional(),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    ATTACHMENT_SCANNER_URL: z.string().url().optional(),
    ATTACHMENT_SCANNER_TOKEN: z.string().min(1).optional(),
  })
  .superRefine((env, context) => {
    if (
      env.APP_ENV !== "development" &&
      !env.BETTER_AUTH_URL.startsWith("https://")
    )
      context.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_URL"],
        message: "HTTPS required",
      });
    if (env.APP_ENV !== "development") {
      for (const field of [
        "S3_ENDPOINT",
        "S3_REGION",
        "S3_BUCKET",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
      ] as const) {
        if (!env[field])
          context.addIssue({
            code: "custom",
            path: [field],
            message: "生产环境必须配置附件存储",
          });
      }
      if (!env.ATTACHMENT_SCANNER_URL)
        context.addIssue({
          code: "custom",
          path: ["ATTACHMENT_SCANNER_URL"],
          message: "预发布和生产环境必须配置附件安全扫描服务",
        });
    }
  });

export function configurationStatus(
  env: Record<string, string | undefined> = process.env,
) {
  const result = schema.safeParse(env);
  return result.success
    ? { ready: true as const, config: result.data }
    : {
        ready: false as const,
        fields: [
          ...new Set(
            result.error.issues.map((issue) => issue.path[0] as string),
          ),
        ],
      };
}

export function getConfig() {
  const status = configurationStatus();
  if (!status.ready)
    throw new Error(`服务配置缺失或无效：${status.fields.join(", ")}`);
  return status.config;
}
