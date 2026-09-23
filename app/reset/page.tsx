import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";
import { resetAction } from "@/app/auth/actions";
import { initialAuthFormState } from "@/app/auth/form-state";
import { getPasswordPolicy } from "@/lib/auth";

export default function ResetPage() {
  const policy = getPasswordPolicy();

  return (
    <AuthCard
      title="Reset password"
      description="Use a one-time reset token generated from the local recovery command."
    >
      <AuthForm
        action={resetAction}
        initialState={initialAuthFormState}
        submitLabel="Reset password"
        fields={
          <>
            <label className="block text-sm font-medium text-slate-700" htmlFor="token">
              Reset token
              <input
                id="token"
                name="token"
                type="text"
                autoComplete="off"
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              New password
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700" htmlFor="confirmPassword">
              Confirm password
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <p className="text-xs leading-5 text-slate-500">Minimum password length: {policy.minPasswordLength}</p>
          </>
        }
      />
    </AuthCard>
  );
}
