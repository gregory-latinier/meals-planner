import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiAdminForm } from "@/components/ai-admin-form";

vi.mock("@/app/admin/ai/actions", () => ({
  initialAiSettingsActionState: { ok: false },
  saveAiSettingsAction: vi.fn(async () => ({ ok: true })),
}));

describe("AiAdminForm token safety", () => {
  it("shows configured status without rendering stored token value", () => {
    render(
      <AiAdminForm
        hasGeminiApiToken
        models={["gemini-1.5-flash"]}
        activeModel="gemini-1.5-flash"
      />,
    );

    expect(screen.getByText(/token configured/i)).toBeInTheDocument();

    const tokenInput = screen.getByLabelText(/gemini api token/i) as HTMLInputElement;
    expect(tokenInput.value).toBe("");
    expect(tokenInput.placeholder).toMatch(/replace existing/i);
  });
});
