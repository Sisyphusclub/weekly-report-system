import { redirect } from "next/navigation";

export const metadata = { title: "老板端 · 阻塞作战中心" };
export default function BossBlockersPage() {
  redirect("/blockers");
}
