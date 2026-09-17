import {
  RiBarChartBoxLine,
  RiFileList3Line,
  RiTeamLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import { LoginForm } from "@/components/workspace/login-form";
import { configurationStatus } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "登录" };

export default function LoginPage() {
  const configured = configurationStatus().ready;
  return (
    <main className="flex min-h-screen flex-col lg:grid lg:grid-cols-2">
      <section className="flex flex-col justify-between border-b border-separator-border bg-background-secondary-default p-6 lg:border-r lg:border-b-0 lg:p-16">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent-600 text-text-white">
            <RiBarChartBoxLine className="size-6" aria-hidden />
          </span>
          <span className="text-headline-medium">市场部工作看板</span>
        </div>
        <div className="hidden max-w-lg flex-col gap-8 py-12 lg:flex">
          <div className="flex flex-col gap-4">
            <p className="text-caption-1-semibold text-text-tertiary">
              记录工作 · 看见进展 · 协同推进
            </p>
            <h2 className="text-large-title-medium text-text-primary">
              让每一次推进，
              <br />
              都有清晰的记录。
            </h2>
            <p className="text-body-regular text-text-secondary">
              连接每日工作与团队目标，在同一处整理日报、追踪计划、协调项目阻塞。
            </p>
          </div>
          <div className="flex flex-col gap-5">
            {[
              {
                icon: RiFileList3Line,
                title: "从日报到周报",
                text: "工作事实可追溯，计划衔接有依据。",
              },
              {
                icon: RiTeamLine,
                title: "成员与项目，双向看进展",
                text: "关注交付和协作，让需要支持的事项被看见。",
              },
              {
                icon: RiShieldCheckLine,
                title: "明确的权限边界",
                text: "草稿仅本人可见，角色分离，保留修订历史。",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <item.icon
                  className="mt-1 size-5 shrink-0 text-foreground-icon-secondary"
                  aria-hidden
                />
                <div>
                  <h2 className="text-body-medium">{item.title}</h2>
                  <p className="mt-1 text-body-regular text-text-secondary">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="hidden text-caption-1-regular text-text-tertiary lg:block">
          市场部协作空间 · Asia/Shanghai
        </p>
      </section>
      <section className="flex flex-1 items-center justify-center p-6 lg:p-16">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <header>
            <p className="mb-3 text-caption-1-semibold text-text-tertiary">
              欢迎回来
            </p>
            <h1 className="text-title-1-medium">登录你的工作台</h1>
            <p className="mt-3 text-body-regular text-text-secondary">
              使用公司分配的用户名和密码。
            </p>
          </header>
          {!configured && (
            <div
              role="status"
              className="rounded-xl border border-border-button-default bg-background-secondary-default p-4"
            >
              <p className="text-body-medium">系统正在初始化</p>
              <p className="mt-2 text-body-regular text-text-secondary">
                数据库与认证服务尚未配置，暂时无法登录。请联系系统管理员完成初始化。
              </p>
            </div>
          )}
          <LoginForm configured={configured} />
          <div className="flex items-center gap-2 border-t border-separator-border pt-6 text-caption-1-regular text-text-tertiary">
            <RiShieldCheckLine className="size-4" aria-hidden />
            老板及管理员账号需完成两步验证
          </div>
        </div>
      </section>
    </main>
  );
}
