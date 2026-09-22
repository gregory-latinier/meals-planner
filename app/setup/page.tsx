import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";
import { setupAction } from "@/app/auth/actions";
import { initialAuthFormState } from "@/app/auth/form-state";
import { getAuthStatus, getPasswordPolicy } from "@/lib/auth";

export default async function SetupPage() {
  const status = await getAuthStatus();

  if (!status.setupEnabled) {
    redirect("/login");
  }

  const policy = getPasswordPolicy();

  return (
    <AuthCard
      title="First-time setup"
      description="Enter the one-time setup token from startup logs and set your admin password."
    >
      <AuthForm
        action={setupAction}
        initialState={initialAuthFormState}
        submitLabel="Complete setup"
        fields={
          <>
            <label className="block text-sm font-medium text-slate-700" htmlFor="token">
              Setup token
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
