import { requireUser } from "@/lib/access";
import { SecurityForm } from "@/components/workspace/security-form";
import { SignOutButton } from "@/components/workspace/sign-out-button";
export const metadata = { title: "账号安全" };
export default async function SecurityPage() {
  await requireUser();
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-medium leading-8">账号安全</h1>
        <SignOutButton />
      </header>
      <section className="rounded-xl border border-slate-200/80 p-6">
        <SecurityForm />
      </section>
    </main>
  );
}
