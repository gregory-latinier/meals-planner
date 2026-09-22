"use server";

import { completePasswordReset, completeSetup, login } from "@/lib/auth";
import type { AuthFormState } from "@/app/auth/form-state";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function loginAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = readField(formData, "password");

  if (!password) {
    return {
      ok: false,
      error: "Password is required.",
    };
  }

  const result = await login(password);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    message: "Login successful.",
  };
}

export async function setupAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const token = readField(formData, "token");
  const password = readField(formData, "password");
  const confirmPassword = readField(formData, "confirmPassword");

  if (!token) {
    return {
      ok: false,
      error: "Setup token is required.",
    };
  }

  if (!password) {
    return {
      ok: false,
      error: "Password is required.",
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      error: "Password confirmation does not match.",
    };
  }

  const result = await completeSetup(token, password);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    message: "Setup complete. You can now sign in at /login.",
  };
}

export async function resetAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const token = readField(formData, "token");
  const password = readField(formData, "password");
  const confirmPassword = readField(formData, "confirmPassword");

  if (!token) {
    return {
      ok: false,
      error: "Reset token is required.",
    };
  }

  if (!password) {
    return {
      ok: false,
      error: "Password is required.",
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      error: "Password confirmation does not match.",
    };
  }

  const result = await completePasswordReset(token, password);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    message: "Password reset complete. Sign in with your new password at /login.",
  };
}
