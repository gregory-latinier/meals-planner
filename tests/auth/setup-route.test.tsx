import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();
const getAuthStatusMock = vi.fn();
const getPasswordPolicyMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth", () => ({
  getAuthStatus: getAuthStatusMock,
  getPasswordPolicy: getPasswordPolicyMock,
}));

describe("Setup page route guard", () => {
  it("redirects to /login when setup is disabled", async () => {
    getAuthStatusMock.mockResolvedValue({ initialized: true, setupEnabled: false });
    getPasswordPolicyMock.mockReturnValue({ minPasswordLength: 12 });

    const module = await import("@/app/setup/page");

    await module.default();

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
