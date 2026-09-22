import React from "react";
import { render, screen } from "@testing-library/react";
import { HomeHero } from "@/components/home-hero";

describe("HomeHero", () => {
  it("renders baseline scaffold copy", () => {
    render(<HomeHero />);

    expect(screen.getByRole("heading", { name: /plan meals\. shop together\./i })).toBeInTheDocument();
    expect(screen.getByText(/baseline app scaffold is running/i)).toBeInTheDocument();
  });
});
