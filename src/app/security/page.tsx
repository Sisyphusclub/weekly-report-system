import { requireUser } from "@/lib/access";
import { SecurityForm } from "@/components/workspace/security-form";
import { SecurityBackLink } from "@/components/workspace/security-back-link";
import { SignOutButton } from "@/components/workspace/sign-out-button";
export const metadata = { title: "账号安全" };
export default async function SecurityPage() {
  const actor = await requireUser();
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 p-6">
      <header className="flex flex-col gap-3">
        <SecurityBackLink
          href={actor.role === "BOSS" ? "/boss/dashboard" : "/dashboard"}
        />
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
