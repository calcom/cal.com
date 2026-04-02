/* eslint-disable playwright/no-conditional-in-test */

/* eslint-disable playwright/missing-playwright-await */
import { fireEvent, render } from "@testing-library/react";
import { vi } from "vitest";
import { Steps } from "./Steps";

const MAX_STEPS = 10;
const CURRENT_STEP = 5;
const mockNavigateToStep = vi.fn();

const Props = {
  maxSteps: MAX_STEPS,
  currentStep: CURRENT_STEP,
  navigateToStep: mockNavigateToStep,
  stepLabel: (currentStep: number, totalSteps: number) => `Test Step ${currentStep} of ${totalSteps}`,
  disableNavigation: undefined,
};

describe("Tests for Steps Component", () => {
  test("Should render the correct number of steps", () => {
    const { queryByTestId } = render(<Steps {...Props} />);

    const stepIndicatorDivs = queryByTestId("step-indicator-container");
    const childDivs = stepIndicatorDivs?.querySelectorAll("div");

    const count = childDivs?.length;
    expect(stepIndicatorDivs).toBeInTheDocument();

    expect(count).toBe(MAX_STEPS);

    for (let i = 0; i < MAX_STEPS; i++) {
      const step = queryByTestId(`step-indicator-${i}`);
      if (i < CURRENT_STEP - 1) {
        expect(step).toHaveClass("cursor-pointer");
      } else {
        expect(step).not.toHaveClass("cursor-pointer");
      }
    }
  });

  test("Should render correctly the label of the steps", () => {
    const { getByText } = render(<Steps {...Props} />);

    expect(getByText(`Test Step ${CURRENT_STEP} of ${MAX_STEPS}`)).toBeInTheDocument();
  });

  test("Should navigate to the correct step when clicked", async () => {
    const { getByTestId } = render(<Steps {...Props} />);

    for (let i = 0; i < MAX_STEPS; i++) {
      const stepIndicator = getByTestId(`step-indicator-${i}`);
      if (i < CURRENT_STEP - 1) {
        fireEvent.click(stepIndicator);
        expect(mockNavigateToStep).toHaveBeenCalled();
        mockNavigateToStep.mockClear();
      } else {
        expect(mockNavigateToStep).not.toHaveBeenCalled();
      }
    }
  });
});
