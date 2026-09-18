import { RiBarChartBoxLine, RiTimeLine } from "@remixicon/react";
import { LoginForm } from "@/components/workspace/login-form";
import { configurationStatus } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "登录" };

export default function LoginPage() {
  const configured = configurationStatus().ready;
  return (
    <main className="flex min-h-screen flex-col bg-background-primary lg:grid lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative hidden overflow-hidden bg-text-primary p-10 text-text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(var(--color-text-white)_1px,transparent_1px),linear-gradient(90deg,var(--color-text-white)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-accent-600 text-text-white">
            <RiBarChartBoxLine className="size-5" aria-hidden />
          </span>
          <span className="text-body-medium">工作看板</span>
        </div>
        <div className="relative flex flex-col gap-10">
          <div>
            <p className="text-caption-1-semibold text-text-white/60">
              MARKETING / WORKSPACE
            </p>
            <h2 className="mt-4 max-w-xl text-[clamp(2.5rem,4vw,4.5rem)] leading-[1.05] font-semibold">
              工作从这里，
              <br />
              继续向前。
            </h2>
          </div>
          <div className="max-w-2xl divide-y divide-text-white/15 border-y border-text-white/15">
            {[
              ["01", "记录日报", "填写今天的工作进展"],
              ["02", "查看项目", "掌握当前项目状态"],
              ["03", "处理阻塞", "及时同步需要协调的事项"],
            ].map(([index, title, detail]) => (
              <div key={index} className="flex items-center gap-5 py-5">
                <span className="text-caption-1-regular text-text-white/40">
                  {index}
                </span>
                <div>
                  <p className="text-body-medium">{title}</p>
                  <p className="mt-1 text-caption-1-regular text-text-white/55">
                    {detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-caption-1-regular text-text-white/50">
          内部工作空间 · Asia/Shanghai
        </p>
      </section>
      <section className="flex min-h-screen flex-1 items-center justify-center border-l border-separator-border p-6 lg:p-16">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent-600 text-text-white">
              <RiBarChartBoxLine className="size-5" aria-hidden />
            </span>
            <span className="text-body-medium">工作看板</span>
          </div>
          <header>
            <p className="mb-3 text-caption-1-semibold text-text-tertiary">
              内部工作空间
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
          <div className="flex items-center gap-2 text-caption-1-regular text-text-tertiary">
            <RiTimeLine className="size-4" aria-hidden />
            <span>工作日常用入口</span>
          </div>
        </div>
      </section>
    </main>
  );
}
