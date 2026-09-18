import { AuditPage } from "@/components/workspace/audit-page";

export const metadata = { title: "审计日志" };
export default function AdminAuditPage(props: {
  searchParams: Promise<{ page?: string; resourceId?: string }>;
}) {
  return <AuditPage {...props} />;
}
