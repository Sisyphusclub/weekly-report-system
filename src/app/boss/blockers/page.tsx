import { redirect } from "next/navigation";

export const metadata = { title: "团队阻塞概览" };
export default function BossBlockersPage() {
  redirect("/blockers");
}
