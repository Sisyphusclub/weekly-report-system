import { permanentRedirect } from "next/navigation";

export default function RetiredAdminTasksPage() {
  permanentRedirect("/dashboard");
}
