import { AuditPage } from "@/components/workspace/audit-page";

export const metadata = { title: "业务变更" };
export default function ActivityPage(props: {
  searchParams: Promise<{ page?: string; resourceId?: string }>;
}) {
  return <AuditPage {...props} business />;
}
