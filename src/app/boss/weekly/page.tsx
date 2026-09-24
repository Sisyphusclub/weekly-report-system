import { redirect } from "next/navigation";
import { requireUser } from "@/lib/access";
import { dateInput } from "@/lib/daily-input";

export const metadata = { title: "周报看板" };

export default async function BossWeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; project?: string }>;
}) {
  const actor = await requireUser();
  if (actor.role !== "BOSS") redirect("/weekly");

  const params = await searchParams;
  const target = new URLSearchParams({ tab: "weekly" });
  if (params.date && dateInput.safeParse(params.date).success)
    target.set("date", params.date);
  if (params.project) target.set("project", params.project);
  redirect(`/boss/dashboard?${target.toString()}`);
}
