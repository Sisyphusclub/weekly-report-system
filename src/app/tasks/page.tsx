import { permanentRedirect } from "next/navigation";

export default function RetiredTasksPage() {
  permanentRedirect("/daily");
}
