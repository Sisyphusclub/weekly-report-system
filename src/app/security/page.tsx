import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/access";
import { ButtonLink } from "@/components/motion/button/base";
import { SecurityForm } from "@/components/workspace/security-form";
import { SignOutButton } from "@/components/workspace/sign-out-button";
export const metadata = { title: "账号安全" };
export default async function SecurityPage() {
  const actor = await requireUser();
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 p-6">
      <header className="flex flex-col gap-3">
        <ButtonLink
          href={actor.role === "BOSS" ? "/boss/dashboard" : "/dashboard"}
          variant="ghost"
          size="small"
          className="self-start"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          返回工作台
        </ButtonLink>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-medium leading-8">账号安全</h1>
          <SignOutButton />
        </div>
      </header>
      <section className="rounded-xl border border-slate-200/80 p-6">
        <SecurityForm />
      </section>
    </main>
  );
}
