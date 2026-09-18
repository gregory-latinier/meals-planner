import { redirect } from "next/navigation";
import { formatISODate, getStartOfWeek } from "@/lib/week";

export default function HomePage() {
  const week = formatISODate(getStartOfWeek(new Date()));
  redirect(`/weeks/${week}`);
}
