import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedPageMock = vi.fn();
const listMealsMock = vi.fn();
const getDefaultMealLibraryViewModeMock = vi.fn();

vi.mock("@/lib/auth-session", () => ({
  requireAuthenticatedPage: requireAuthenticatedPageMock,
}));

vi.mock("@/lib/meal-library-db", () => ({
  listMeals: listMealsMock,
  getDefaultMealLibraryViewMode: getDefaultMealLibraryViewModeMock,
}));

vi.mock("@/components/meal-library-client", () => ({
  MealLibraryClient: () => <div data-testid="meal-library-client" />,
}));

describe("library page auth gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedPageMock.mockResolvedValue(undefined);
    listMealsMock.mockResolvedValue([]);
    getDefaultMealLibraryViewModeMock.mockReturnValue("grid");
  });

  it("requires auth before loading library data", async () => {
    const module = await import("@/app/library/page");

    await module.default({
      searchParams: Promise.resolve({ q: "pasta", sort: "name-asc" }),
    });

    expect(requireAuthenticatedPageMock).toHaveBeenCalledTimes(1);
    expect(listMealsMock).toHaveBeenCalledWith("pasta", "name-asc");
  });

  it("does not query library data when auth guard interrupts", async () => {
    requireAuthenticatedPageMock.mockRejectedValue(new Error("redirect"));

    const module = await import("@/app/library/page");

    await expect(
      module.default({
        searchParams: Promise.resolve({ q: "pasta", sort: "created-newest" }),
      }),
    ).rejects.toThrow("redirect");

    expect(listMealsMock).not.toHaveBeenCalled();
  });
});
