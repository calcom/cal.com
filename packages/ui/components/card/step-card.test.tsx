/* eslint-disable playwright/missing-playwright-await */
import { render, screen } from "@testing-library/react";

import { StepCard } from "./StepCard";

describe("Tests for StepCard component", () => {
  test("should render StepCard", () => {
    render(<StepCard>StepCard</StepCard>);
    expect(screen.getByText("StepCard")).toBeInTheDocument();
  });
});
