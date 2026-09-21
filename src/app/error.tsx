"use client";
import { Button } from "@/components/motion/button/base";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-5 p-8">
      <h1 className="text-2xl font-medium leading-8">暂时无法加载工作台</h1>
      <p className="text-sm font-normal leading-5 text-muted-foreground">
        服务或数据库连接出现问题。请稍后重试；如果持续失败，请联系管理员检查连接与迁移状态。
      </p>
      <Button onClick={reset}>重新加载</Button>
    </main>
  );
}

