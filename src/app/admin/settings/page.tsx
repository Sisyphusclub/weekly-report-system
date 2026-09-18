import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/shell";
import { SettingsForm } from "@/components/workspace/settings-form";
import { requireUser } from "@/lib/access";
import { getConfig } from "@/lib/config";
import { getDb } from "@/lib/db";
import { organization } from "@/lib/db/schema";

export const metadata = { title: "系统设置" };
export default async function SettingsPage() {
  const actor = await requireUser();
  if (actor.role !== "ADMIN") notFound();
  const [settings] = await getDb()
    .select({
      name: organization.name,
      version: organization.version,
      timezone: organization.timezone,
      locale: organization.locale,
    })
    .from(organization)
    .where(eq(organization.id, actor.organizationId))
    .limit(1);
  if (!settings) notFound();
  const config = getConfig();
  const storageReady = [
    config.S3_ENDPOINT,
    config.S3_REGION,
    config.S3_BUCKET,
    config.S3_ACCESS_KEY_ID,
    config.S3_SECRET_ACCESS_KEY,
  ].every(Boolean);
  const details = [
    [
      "运行环境",
      { development: "开发", staging: "预发布", production: "生产" }[
        config.APP_ENV
      ],
    ],
    ["业务时区", settings.timezone],
    ["界面语言", settings.locale === "zh-CN" ? "简体中文" : settings.locale],
    ["附件存储", storageReady ? "已配置" : "未完整配置"],
    ["附件安全扫描", config.ATTACHMENT_SCANNER_URL ? "已配置" : "未配置"],
    ["日报截止时间", "工作日 18:30"],
    ["周报截止时间", "当周最后一个工作日 18:30"],
  ];
  return (
    <WorkspaceShell actor={actor} selected="settings">
      <h1 className="text-title-1-medium">系统设置</h1>
      <SettingsForm name={settings.name} version={settings.version} />
      <section className="rounded-3xl border border-border-button-default p-6">
        <h2 className="text-title-2-medium">运行配置</h2>
        <dl className="mt-4 divide-y divide-separator-border">
          {details.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-wrap justify-between gap-3 py-3"
            >
              <dt className="text-body-regular text-text-secondary">{label}</dt>
              <dd className="text-body-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-body-regular text-text-secondary">
          服务连接状态由部署检查确认。运行配置变更由运维人员执行。
        </p>
      </section>
    </WorkspaceShell>
  );
}
