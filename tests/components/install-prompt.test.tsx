import React from "react";
import { render } from "@testing-library/react";
import { InstallPrompt } from "@/components/install-prompt";

describe("InstallPrompt", () => {
  const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

  afterEach(() => {
    if (originalServiceWorker) {
      Object.defineProperty(navigator, "serviceWorker", originalServiceWorker);
      return;
    }

    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it("registers /sw.js when serviceWorker is available", () => {
    const register = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    });

    render(<InstallPrompt />);

    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("is a no-op and does not crash when serviceWorker is unavailable", () => {
    Reflect.deleteProperty(navigator, "serviceWorker");

    expect(() => render(<InstallPrompt />)).not.toThrow();
  });
});
