"use client";

import { useState } from "react";
import type { Meal } from "@prisma/client";
import { MealForm } from "@/components/meal-form";

type MealItemProps = {
  meal: Meal;
  onDelete: () => Promise<void>;
  onUpdate: (formData: FormData) => Promise<void>;
};

export function MealItem({ meal, onDelete, onUpdate }: MealItemProps) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="meal-item">
      <div className="meal-head">
        <strong>{meal.title}</strong>
        <div className="btn-row">
          <button type="button" onClick={() => setEditing((value) => !value)}>
            {editing ? "Cancel" : "Edit"}
          </button>
          <form
            action={async () => {
              try {
                setError(null);
                await onDelete();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Unable to delete meal.");
              }
            }}
          >
            <button type="submit">Delete</button>
          </form>
        </div>
      </div>

      {meal.notes ? <p className="meal-notes">{meal.notes}</p> : null}

      {editing ? (
        <MealForm
          submitLabel="Save"
          initialValues={{ title: meal.title, notes: meal.notes, day: meal.day }}
          action={async (formData) => {
            try {
              setError(null);
              await onUpdate(formData);
              setEditing(false);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Unable to update meal.");
            }
          }}
        />
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </li>
  );
}
