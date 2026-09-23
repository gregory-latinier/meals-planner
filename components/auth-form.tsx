"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ReactNode } from "react";
import type { AuthFormState } from "@/app/auth/form-state";

type AuthFormProps = {
  action: (prevState: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  initialState: AuthFormState;
  submitLabel: string;
  fields: ReactNode;
};

export function AuthForm({ action, initialState, submitLabel, fields }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {fields}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Please wait..." : submitLabel}
      </button>

      {state.error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.ok && state.message ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {state.message}
        </p>
      ) : null}

      {state.ok && state.nextHref ? (
        <Link
          href={state.nextHref}
          className="block w-full rounded-xl border border-emerald-700 px-4 py-3 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
        >
          {state.nextLabel ?? state.nextHref}
        </Link>
      ) : null}
    </form>
  );
}
