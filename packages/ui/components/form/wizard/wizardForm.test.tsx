/* eslint-disable playwright/missing-playwright-await */
import { render, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { WizardForm } from "./WizardForm";

vi.mock("@calcom/lib/hooks/useCompatSearchParams", () => ({
  useCompatSearchParams() {
    return { get: vi.fn().mockReturnValue(currentStepNavigation) };
  },
}));

vi.mock("next/navigation", () => ({
  useRouter() {
    return { replace: vi.fn() };
  },
  useSearchParams() {
    return { get: vi.fn().mockReturnValue(currentStepNavigation) };
  },
}));

vi.mock("nuqs", () => ({
  useQueryState: vi.fn(() => [currentStepNavigation, vi.fn()]),
  createParser: vi.fn(() => ({
    withDefault: vi.fn(() => ({})),
  })),
}));

const steps = [
  {
    title: "Step 1",
    description: "Description 1",
    content: <p data-testid="content-1">Step 1</p>,
    isEnabled: false,
  },
  {
    title: "Step 2",
    description: "Description 2",
    content: (setIsPending: (value: boolean) => void) => (
      <button data-testid="content-2" onClick={() => setIsPending(true)}>
        Test
      </button>
    ),
    isEnabled: true,
  },
  { title: "Step 3", description: "Description 3", content: <p data-testid="content-3">Step 3</p> },
];

const props = {
  href: "/test/mock",
  steps: steps,
  nextLabel: "Next step",
  prevLabel: "Previous step",
  finishLabel: "Finish",
};

let currentStepNavigation: number;

const renderComponent = (extraProps?: { disableNavigation: boolean }) =>
  render(<WizardForm {...props} {...extraProps} />);

describe("Tests for WizardForm component", () => {
  test("Should handle all the steps correctly", async () => {
    currentStepNavigation = 1;
    const { queryByTestId, queryByText, rerender } = renderComponent();
    const { prevLabel, nextLabel, finishLabel } = props;
    const stepInfo = {
      title: queryByTestId("step-title"),
      description: queryByTestId("step-description"),
    };

    await waitFor(() => {
      steps.forEach((step, index) => {
        rerender(<WizardForm {...props} />);

        const { title, description } = step;
        const buttons = {
          prev: queryByText(prevLabel),
          next: queryByText(nextLabel),
          finish: queryByText(finishLabel),
        };

        expect(stepInfo.title).toHaveTextContent(title);
        expect(stepInfo.description).toHaveTextContent(description);

        if (index === 0) {
          // case of first step
          expect(buttons.prev && buttons.finish).not.toBeInTheDocument();
          expect(buttons.next).toBeInTheDocument();
        } else if (index === steps.length - 1) {
          // case of last step
          expect(buttons.prev && buttons.finish).toBeInTheDocument();
          expect(buttons.next).not.toBeInTheDocument();
        } else {
          // case of in-between steps
          expect(buttons.prev && buttons.next).toBeInTheDocument();
          expect(buttons.finish).not.toBeInTheDocument();
        }

        currentStepNavigation++;
      });
    });
  });

  describe("Should handle the visibility of the content", async () => {
    test("Should render JSX content correctly", async () => {
      currentStepNavigation = 1;
      const { getByTestId, getByText } = renderComponent();
      const currentStep = steps[0];

      expect(getByTestId("content-1")).toBeInTheDocument();
      expect(getByText(currentStep.title && currentStep.description)).toBeInTheDocument();
    });

    test("Should render function content correctly", async () => {
      currentStepNavigation = 2;
      const { getByTestId, getByText } = renderComponent();
      const currentStep = steps[1];

      expect(getByTestId("content-2")).toBeInTheDocument();
      expect(getByText(currentStep.title && currentStep.description)).toBeInTheDocument();
    });
  });

  test("Should disable 'Next step' button if current step navigation is not enabled", async () => {
    currentStepNavigation = 1;
    const { nextLabel } = props;
    const { getByRole } = renderComponent();

    const nextButton = getByRole("button", { name: nextLabel });
    expect(nextButton).toBeDisabled();
  });

  test("Should handle when navigation is disabled", async () => {
    const { queryByText, queryByTestId } = renderComponent({ disableNavigation: true });
    const { prevLabel, nextLabel, finishLabel } = props;
    const stepComponent = queryByTestId("wizard-step-component");
    const stepInfo = {
      title: queryByTestId("step-title"),
      description: queryByTestId("step-description"),
    };
    const buttons = {
      prev: queryByText(prevLabel),
      next: queryByText(nextLabel),
      finish: queryByText(finishLabel),
    };

    expect(stepInfo.title && stepInfo.description).toBeInTheDocument();
    expect(stepComponent).not.toBeInTheDocument();
    expect(buttons.prev && buttons.next && buttons.finish).not.toBeInTheDocument();
  });
});
