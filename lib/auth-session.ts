import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthSessionToken, validateAuthSessionToken } from "@/lib/auth";

const AUTH_SESSION_COOKIE_NAME = "mp_admin_session";
const AUTH_REQUIRED_ERROR = "Authentication required. Sign in at /login and retry.";

function getSessionTtlSeconds(): number {
  const value = process.env.AUTH_SESSION_TTL_HOURS;
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 12 * 60 * 60;
  }

  return parsed * 60 * 60;
}

export async function setAuthSessionCookie(): Promise<boolean> {
  const token = await createAuthSessionToken();

  if (!token) {
    return false;
  }

  const cookieStore = await cookies();

  cookieStore.set({
    name: AUTH_SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionTtlSeconds(),
  });

  return true;
}

export async function clearAuthSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_COOKIE_NAME);
}

export async function isAuthenticatedRequest(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  return validateAuthSessionToken(token);
}

export async function requireAuthenticatedPage(): Promise<void> {
  if (!(await isAuthenticatedRequest())) {
    redirect("/login");
  }
}

export async function requireAuthenticatedAction(): Promise<{ ok: false; error: string } | null> {
  if (await isAuthenticatedRequest()) {
    return null;
  }

  return {
    ok: false,
    error: AUTH_REQUIRED_ERROR,
  };
}
