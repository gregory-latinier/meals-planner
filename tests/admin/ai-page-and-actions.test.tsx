import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const requireAuthenticatedPageMock = vi.fn();
const requireAuthenticatedActionMock = vi.fn();
const getAiSettingsMock = vi.fn();
const saveAiSettingsMock = vi.fn();
const revalidatePathMock = vi.fn();
const aiAdminFormMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/auth-session", () => ({
  requireAuthenticatedPage: requireAuthenticatedPageMock,
  requireAuthenticatedAction: requireAuthenticatedActionMock,
}));

vi.mock("@/lib/meal-library-db", () => ({
  getAiSettings: getAiSettingsMock,
  saveAiSettings: saveAiSettingsMock,
}));

vi.mock("@/components/ai-admin-form", () => ({
  AiAdminForm: (props: unknown) => {
    aiAdminFormMock(props);
    return <div data-testid="ai-admin-form" />;
  },
}));

describe("AI admin auth guard and token-safe UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedPageMock.mockResolvedValue(undefined);
    requireAuthenticatedActionMock.mockResolvedValue(null);
  });

  it("enforces page auth guard and only exposes token presence state", async () => {
    getAiSettingsMock.mockResolvedValue({
      geminiApiToken: "super-secret-token",
      models: ["gemini-1.5-flash"],
      activeModel: "gemini-1.5-flash",
    });

    const module = await import("@/app/admin/ai/page");
    const page = await module.default();
    render(page);

    expect(requireAuthenticatedPageMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("ai-admin-form")).toBeInTheDocument();
    expect(aiAdminFormMock).toHaveBeenCalledTimes(1);

    const props = aiAdminFormMock.mock.calls[0][0] as Record<string, unknown>;
    expect(props).toMatchObject({
      hasGeminiApiToken: true,
      models: ["gemini-1.5-flash"],
      activeModel: "gemini-1.5-flash",
    });
    expect(props).not.toHaveProperty("geminiApiToken");
  });

  it("returns auth error for unauthenticated save action", async () => {
    requireAuthenticatedActionMock.mockResolvedValue({
      ok: false,
      error: "Authentication required. Sign in at /login and retry.",
    });

    const module = await import("@/app/admin/ai/actions");
    const formData = new FormData();
    formData.set("geminiApiToken", "new-token");
    formData.set("models", "gemini-1.5-flash");
    formData.set("activeModel", "gemini-1.5-flash");

    const result = await module.saveAiSettingsAction(module.initialAiSettingsActionState, formData);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/authentication required/i);
    expect(saveAiSettingsMock).not.toHaveBeenCalled();
  });

  it("preserves existing token when replacement input is blank", async () => {
    getAiSettingsMock.mockResolvedValue({
      geminiApiToken: "existing-token",
      models: ["gemini-1.5-flash"],
      activeModel: "gemini-1.5-flash",
    });

    const module = await import("@/app/admin/ai/actions");
    const formData = new FormData();
    formData.set("geminiApiToken", "");
    formData.set("models", "gemini-1.5-flash");
    formData.set("activeModel", "gemini-1.5-flash");

    const result = await module.saveAiSettingsAction(module.initialAiSettingsActionState, formData);

    expect(result.ok).toBe(true);
    expect(saveAiSettingsMock).toHaveBeenCalledWith({
      geminiApiToken: "existing-token",
      models: ["gemini-1.5-flash"],
      activeModel: "gemini-1.5-flash",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/ai");
  });
});
