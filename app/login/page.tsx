import { AuthCard } from "@/components/auth-card";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "@/app/auth/actions";
import { initialAuthFormState } from "@/app/auth/form-state";

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Use your local admin password to access this self-hosted instance."
    >
      <AuthForm
        action={loginAction}
        initialState={initialAuthFormState}
        submitLabel="Sign in"
        fields={
          <label className="block text-sm font-medium text-slate-700" htmlFor="password">
            Password
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        }
      />
    </AuthCard>
  );
}
