import Link from "next/link";
import { notFound } from "next/navigation";
import { dayDisplay, dayValues, type WeekDay } from "@/lib/day";
import {
  getWeekMeals,
  getWeekPlan,
  updateMeal,
  createMeal,
  deleteMeal,
} from "@/lib/meals";
import { formatISODate, parseWeekStart, shiftWeek } from "@/lib/week";
import { MealForm } from "@/components/meal-form";
import { MealItem } from "@/components/meal-item";

type PageProps = {
  params: {
    weekStart: string;
  };
};

export default async function WeekPage({ params }: PageProps) {
  const parsedWeek = parseWeekStart(params.weekStart);
  if (!parsedWeek) {
    notFound();
  }

  const weekStart = formatISODate(parsedWeek);
  const plan = await getWeekPlan(weekStart);
  const meals = await getWeekMeals(plan.id);

  const grouped = {
    unassigned: meals.filter((m) => !m.day),
    days: dayValues.reduce(
      (acc, day) => {
        acc[day] = meals.filter((m) => m.day === day);
        return acc;
      },
      {} as Record<WeekDay, typeof meals>,
    ),
  };

  const previousWeek = formatISODate(shiftWeek(parsedWeek, -1));
  const nextWeek = formatISODate(shiftWeek(parsedWeek, 1));

  return (
    <main>
      <h1 className="page-title">Weekly Meal Plan</h1>
      <nav className="week-nav" aria-label="Week navigation">
        <Link className="week-link" href={`/weeks/${previousWeek}`}>
          ← {previousWeek}
        </Link>
        <span className="week-link active">{weekStart}</span>
        <Link className="week-link" href={`/weeks/${nextWeek}`}>
          {nextWeek} →
        </Link>
      </nav>

      <section className="section" style={{ marginBottom: "0.75rem" }}>
        <h2>Add meal</h2>
        <MealForm
          submitLabel="Add meal"
          action={async (formData) => {
            "use server";
            await createMeal(plan.id, formData);
          }}
        />
      </section>

      <div className="columns">
        {dayValues.map((day) => (
          <section key={day} className="section">
            <h2>{dayDisplay[day]}</h2>
            <ul className="meal-list">
              {grouped.days[day].map((meal) => (
                <MealItem
                  key={meal.id}
                  meal={meal}
                  onDelete={async () => {
                    "use server";
                    await deleteMeal(plan.id, meal.id);
                  }}
                  onUpdate={async (formData) => {
                    "use server";
                    await updateMeal(plan.id, meal.id, formData);
                  }}
                />
              ))}
              {grouped.days[day].length === 0 ? <li className="small">No meals yet.</li> : null}
            </ul>
          </section>
        ))}

        <section className="section">
          <h2>Unassigned</h2>
          <ul className="meal-list">
            {grouped.unassigned.map((meal) => (
              <MealItem
                key={meal.id}
                meal={meal}
                onDelete={async () => {
                  "use server";
                  await deleteMeal(plan.id, meal.id);
                }}
                onUpdate={async (formData) => {
                  "use server";
                  await updateMeal(plan.id, meal.id, formData);
                }}
              />
            ))}
            {grouped.unassigned.length === 0 ? <li className="small">No unassigned meals.</li> : null}
          </ul>
        </section>
      </div>
    </main>
  );
}
