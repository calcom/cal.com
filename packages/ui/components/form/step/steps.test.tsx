/* eslint-disable playwright/missing-playwright-await */
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import { Steps } from "./Steps";

const MAX_STEPS = 4;
let CURRENT_STEP = 2;
const mockNavigateToStep = vi.fn();

const Props = {
  maxSteps: MAX_STEPS,
  currentStep: CURRENT_STEP,
  navigateToStep: mockNavigateToStep,
  stepLabel: (currentStep: number, totalSteps: number) => `Test Step ${currentStep} of ${totalSteps}`,
};

describe("Tests for Steps Component", () => {
  test("Should render the correct number of steps", () => {
    const { getByTestId, getByText } = render(<Steps {...Props} />);

    for (let i = 0; i < Props.maxSteps; i++) {
      const step = getByTestId(`step-indicator-${i}`);
      const expectedTestId = `step-indicator-${i}`;
      expect(step).toHaveAttribute("data-testid", expectedTestId);
    }

    expect(getByText(`Test Step ${CURRENT_STEP} of ${MAX_STEPS}`)).toBeInTheDocument();
  });
  test("Should navigate to the correct step when clicked", () => {
    const { getByTestId, getByText, rerender } = render(<Steps {...Props} />);

    const stepIndicators = getByTestId("step-indicator-1");
    fireEvent.click(stepIndicators);
    expect(mockNavigateToStep).toHaveBeenCalledTimes(1);

    CURRENT_STEP = CURRENT_STEP + 1;

    rerender(<Steps {...{ ...Props, currentStep: CURRENT_STEP }} />);
    const newLabel = getByText(`Test Step ${CURRENT_STEP} of ${MAX_STEPS}`);
    expect(newLabel).toBeInTheDocument();
  });
});
