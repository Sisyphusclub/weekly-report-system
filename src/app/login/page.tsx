import { RiBarChartBoxLine, RiShieldCheckLine } from "@remixicon/react";
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
        <div className="hidden max-w-lg flex-col gap-10 py-12 lg:flex">
          <div className="flex flex-col gap-5">
            <p className="text-caption-1-semibold text-text-tertiary">
              MARKETING · WORKSPACE
            </p>
            <h2 className="max-w-md text-large-title-medium text-text-primary">
              把每天的工作，
              <br />
              留在同一处。
            </h2>
            <p className="max-w-md text-body-regular leading-7 text-text-secondary">
              日报、计划、项目进展与协作事项，按团队的节奏持续更新。
            </p>
          </div>
          <div className="border-l-2 border-accent-600 pl-5">
            <p className="text-body-medium text-text-primary">
              工作记录与项目协同
            </p>
            <p className="mt-1 text-body-regular text-text-secondary">
              Asia/Shanghai · 内部使用
            </p>
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
              WORKSPACE
            </p>
            <h1 className="text-title-1-medium">登录</h1>
          </header>
          {!configured && (
            <div
              role="status"
              className="rounded-xl border border-border-button-default bg-background-secondary-default p-4"
            >
              <p className="text-body-medium">系统正在初始化</p>
              <p className="mt-2 text-body-regular text-text-secondary">
                当前环境尚未完成初始化，请联系管理员。
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
