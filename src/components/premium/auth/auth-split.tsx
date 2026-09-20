"use client";

import { BarChart3, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { Silk } from "./silk";

export type AuthSplitProps = {
  brand?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  panelEyebrow?: string;
  panelTitle?: string;
  panelDescription?: string;
  children: ReactNode;
  className?: string;
};

export function AuthSplit({
  brand = "工作看板",
  eyebrow = "内部工作空间",
  title = "登录",
  description = "使用管理员分配的账号进入工作台。",
  panelEyebrow = "MARKETING / WORKSPACE",
  panelTitle = "让每天的进展，都能沉淀为团队判断。",
  panelDescription = "日报、周报与阻塞统一归档，负责人可以随时掌握项目推进状态。",
  children,
  className,
}: AuthSplitProps) {
  const reduce = useReducedMotion();

  return (
    <section
      className={cn(
        "grid min-h-screen w-full bg-background lg:grid-cols-2",
        className,
      )}
    >
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BarChart3 className="size-5" aria-hidden />
            </span>
            <span className="text-sm font-semibold text-foreground">
              {brand}
            </span>
          </div>

          <p className="mt-10 text-xs font-medium text-primary">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <div className="mt-8">{children}</div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden lg:block">
        <Silk
          className="absolute inset-0"
          color="#315f74"
          speed={2.4}
          scale={0.9}
          noiseIntensity={1.1}
          rotation={0}
        />
        <div className="absolute inset-0 bg-foreground/5" />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-2 text-sm font-medium text-white/80">
            <ShieldCheck className="size-4" aria-hidden />
            内部安全工作区
          </div>
          <div>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduce ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT }
              }
              className="text-sm font-medium text-white/80"
            >
              {panelEyebrow}
            </motion.p>
            <motion.h2
              initial={
                reduce ? false : { opacity: 0, y: 16, filter: "blur(8px)" }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 0.6, ease: EASE_OUT, delay: 0.1 }
              }
              className="mt-3 max-w-lg text-balance text-4xl font-semibold leading-tight text-white"
            >
              {panelTitle}
            </motion.h2>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 0.5, ease: EASE_OUT, delay: 0.18 }
              }
              className="mt-5 max-w-lg text-sm leading-7 text-white/75"
            >
              {panelDescription}
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}
