import { redirect } from "next/navigation";
import { formatISOMonth, getStartOfMonth } from "@/lib/week";

export default function HistoryIndexPage() {
  const month = formatISOMonth(getStartOfMonth(new Date()));
  redirect(`/history/${month}`);
}
