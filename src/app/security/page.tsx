import { requireUser } from "@/lib/access";
import { SecurityForm } from "@/components/workspace/security-form";
import { SignOutButton } from "@/components/workspace/sign-out-button";
export const metadata = { title: "账号安全" };
export default async function SecurityPage() {
  const actor = await requireUser({ allowSecuritySetup: true });
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-title-1-medium">账号安全</h1>
        <SignOutButton />
      </header>
      <section className="rounded-3xl border border-border-button-default p-6">
        <SecurityForm
          mustChangePassword={actor.mustChangePassword}
          twoFactorEnabled={actor.twoFactorEnabled}
          required={actor.role !== "EMPLOYEE"}
        />
      </section>
    </main>
  );
}
