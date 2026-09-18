import { RiArrowUpLine, RiBarChartBoxLine, RiTimeLine } from "@remixicon/react";
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
              MARKETING / 2026
            </p>
            <h2 className="mt-4 max-w-xl text-[clamp(2.5rem,4vw,4.5rem)] leading-[1.05] font-semibold">
              今天的进展，
              <br />
              明天接着做。
            </h2>
          </div>
          <div className="grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-lg border border-text-white/15 bg-text-white/15">
            {[
              ["本周完成", "24", "+18%"],
              ["进行中", "12", "稳定"],
              ["待协调", "03", "需关注"],
            ].map(([label, value, change], index) => (
              <div key={label} className="bg-text-primary/80 p-5">
                <p className="text-caption-1-regular text-text-white/60">
                  {label}
                </p>
                <p className="mt-3 text-headline-medium">{value}</p>
                <p
                  className={`mt-2 text-caption-1-regular ${index === 2 ? "text-warning-500" : "text-success-500"}`}
                >
                  {index === 0 && (
                    <RiArrowUpLine className="mr-1 inline size-3" aria-hidden />
                  )}
                  {change}
                </p>
              </div>
            ))}
          </div>
          <div className="max-w-2xl border-t border-text-white/15 pt-5">
            <div className="flex justify-between text-caption-1-regular text-text-white/60">
              <span>本周项目节奏</span>
              <span>截至今日 18:30</span>
            </div>
            <div className="mt-4 flex items-end gap-2">
              {[42, 58, 46, 76, 68, 88, 64].map((height, index) => (
                <div
                  key={index}
                  className="flex-1 rounded-t-sm bg-accent-500/80"
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>
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
