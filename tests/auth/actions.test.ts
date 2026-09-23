import { describe, expect, it, vi } from "vitest";

const loginMock = vi.fn();
const completeSetupMock = vi.fn();
const completePasswordResetMock = vi.fn();
const setAuthSessionCookieMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  login: loginMock,
  completeSetup: completeSetupMock,
  completePasswordReset: completePasswordResetMock,
}));

vi.mock("@/lib/auth-session", () => ({
  setAuthSessionCookie: setAuthSessionCookieMock,
}));

describe("Auth form server actions", () => {
  it("returns clear validation errors for login", async () => {
    const module = await import("@/app/auth/actions");
    const formState = await import("@/app/auth/form-state");

    const formData = new FormData();
    const result = await module.loginAction(formState.initialAuthFormState, formData);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/password is required/i);
  });

  it("returns setup mismatch error before service call", async () => {
    const module = await import("@/app/auth/actions");
    const formState = await import("@/app/auth/form-state");

    const formData = new FormData();
    formData.set("token", "abc");
    formData.set("password", "password-1");
    formData.set("confirmPassword", "password-2");

    const result = await module.setupAction(formState.initialAuthFormState, formData);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/does not match/i);
    expect(completeSetupMock).not.toHaveBeenCalled();
  });

  it("returns reset success message", async () => {
    completePasswordResetMock.mockResolvedValue({ ok: true });

    const module = await import("@/app/auth/actions");
    const formState = await import("@/app/auth/form-state");

    const formData = new FormData();
    formData.set("token", "abc");
    formData.set("password", "password-1");
    formData.set("confirmPassword", "password-1");

    const result = await module.resetAction(formState.initialAuthFormState, formData);

    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/password reset complete/i);
    expect(result.nextHref).toBe("/login");
    expect(result.nextLabel).toMatch(/login/i);
  });

  it("returns setup success message with login link", async () => {
    completeSetupMock.mockResolvedValue({ ok: true });

    const module = await import("@/app/auth/actions");
    const formState = await import("@/app/auth/form-state");

    const formData = new FormData();
    formData.set("token", "abc");
    formData.set("password", "password-1");
    formData.set("confirmPassword", "password-1");

    const result = await module.setupAction(formState.initialAuthFormState, formData);

    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/setup complete/i);
    expect(result.nextHref).toBe("/login");
    expect(result.nextLabel).toMatch(/login/i);
  });

  it("sets auth session cookie after successful login", async () => {
    loginMock.mockResolvedValue({ ok: true });
    setAuthSessionCookieMock.mockResolvedValue(true);

    const module = await import("@/app/auth/actions");
    const formState = await import("@/app/auth/form-state");

    const formData = new FormData();
    formData.set("password", "correct-password");

    const result = await module.loginAction(formState.initialAuthFormState, formData);

    expect(result.ok).toBe(true);
    expect(setAuthSessionCookieMock).toHaveBeenCalledTimes(1);
  });
});
