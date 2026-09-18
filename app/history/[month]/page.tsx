import Link from "next/link";
import { notFound } from "next/navigation";
import { dayValues, type WeekDay } from "@/lib/day";
import { getWeekPlansWithMealsInRange } from "@/lib/meals";
import {
  formatISODate,
  formatISOMonth,
  getStartOfMonth,
  getStartOfWeek,
  parseMonth,
  parseWeekStart,
  shiftMonth,
} from "@/lib/week";

type PageProps = {
  params: {
    month: string;
  };
};

type CalendarDay = {
  isoDate: string;
  inMonth: boolean;
  mealTitles: string[];
};

type HistoryListDay = {
  isoDate: string;
  label: string;
  mealTitles: string[];
};

function getMonthLabel(monthStart: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthStart);
}

function dayOffset(day: WeekDay): number {
  return dayValues.indexOf(day);
}

function buildCalendarDays(monthStart: Date, mealTitlesByDate: Map<string, string[]>): CalendarDay[] {
  const firstVisible = getStartOfWeek(monthStart);
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const lastVisible = new Date(monthEnd);
  lastVisible.setUTCDate(lastVisible.getUTCDate() + ((7 - lastVisible.getUTCDay()) % 7));

  const days: CalendarDay[] = [];
  for (const cursor = new Date(firstVisible); cursor <= lastVisible; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const isoDate = formatISODate(cursor);
    days.push({
      isoDate,
      inMonth: cursor.getUTCMonth() === monthStart.getUTCMonth(),
      mealTitles: mealTitlesByDate.get(isoDate) ?? [],
    });
  }

  return days;
}

export default async function HistoryMonthPage({ params }: PageProps) {
  const parsedMonth = parseMonth(params.month);
  if (!parsedMonth) {
    notFound();
  }

  const monthStart = getStartOfMonth(parsedMonth);
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const rangeStart = formatISODate(getStartOfWeek(monthStart));
  const rangeEnd = formatISODate(getStartOfWeek(monthEnd));

  const plans = await getWeekPlansWithMealsInRange(rangeStart, rangeEnd);

  const mealTitlesByDate = new Map<string, string[]>();
  for (const plan of plans) {
    const weekDate = parseWeekStart(plan.weekStart);
    if (!weekDate) {
      continue;
    }

    for (const meal of plan.meals) {
      if (!meal.day) {
        continue;
      }

      const mealDate = new Date(weekDate);
      mealDate.setUTCDate(mealDate.getUTCDate() + dayOffset(meal.day));
      const mealDateKey = formatISODate(mealDate);
      const titles = mealTitlesByDate.get(mealDateKey) ?? [];
      titles.push(meal.title);
      mealTitlesByDate.set(mealDateKey, titles);
    }
  }

  const calendarDays = buildCalendarDays(monthStart, mealTitlesByDate);

  const previousMonth = formatISOMonth(shiftMonth(monthStart, -1));
  const nextMonth = formatISOMonth(shiftMonth(monthStart, 1));
  const monthLabel = getMonthLabel(monthStart);

  const listDays: HistoryListDay[] = calendarDays
    .filter((day) => day.inMonth && day.mealTitles.length > 0)
    .map((day) => ({
      isoDate: day.isoDate,
      label: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${day.isoDate}T00:00:00.000Z`)),
      mealTitles: day.mealTitles,
    }));

  return (
    <main>
      <h1 className="page-title">Meal History</h1>

      <nav className="week-nav" aria-label="Month navigation">
        <Link className="week-link" href={`/history/${previousMonth}`}>
          ← {previousMonth}
        </Link>
        <span className="week-link active">{getMonthLabel(monthStart)}</span>
        <Link className="week-link" href={`/history/${nextMonth}`}>
          {nextMonth} →
        </Link>
      </nav>

      <section className="section" style={{ marginBottom: "0.75rem" }}>
        <h2>History</h2>
        {plans.length === 0 ? (
          <p className="small">No meal history yet for this month. Plan meals in a week to see history here.</p>
        ) : (
          <>
            <p className="small" style={{ marginTop: 0 }}>
              {monthLabel} · {listDays.length} day{listDays.length === 1 ? "" : "s"} with planned meals
            </p>
            {listDays.length === 0 ? (
              <p className="small">No planned meals were found for this month.</p>
            ) : (
              <ul className="history-day-list">
                {listDays.map((day) => (
                  <li key={day.isoDate} className="history-day-card">
                    <div className="history-day-header">
                      <strong>{day.label}</strong>
                      <span className="small">{day.mealTitles.length} meal{day.mealTitles.length === 1 ? "" : "s"}</span>
                    </div>
                    <ul className="meal-list">
                      {day.mealTitles.map((title, index) => (
                        <li key={`${day.isoDate}-${index}`} className="meal-item">
                          <strong>{title}</strong>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </main>
  );
}
