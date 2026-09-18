"use client";

import { dayDisplay, dayValues } from "@/lib/day";

type MealFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  initialValues?: {
    title?: string;
    notes?: string | null;
    day?: string | null;
  };
};

export function MealForm({ action, submitLabel, initialValues }: MealFormProps) {
  return (
    <form className="inline-form" action={action}>
      <div>
        <label className="field">
          Meal name
          <input name="title" defaultValue={initialValues?.title ?? ""} required />
        </label>
      </div>

      <div>
        <label className="field">
          Notes (optional)
          <textarea name="notes" rows={2} defaultValue={initialValues?.notes ?? ""} />
        </label>
      </div>

      <div>
        <label className="field">
          Day (optional)
          <select name="day" defaultValue={initialValues?.day ?? ""}>
            <option value="">Unassigned</option>
            {dayValues.map((day) => (
              <option key={day} value={day}>
                {dayDisplay[day]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="btn-row">
        <button className="primary" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
