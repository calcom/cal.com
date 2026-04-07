import { render, screen } from "@testing-library/react";
import { vi, describe, test, expect } from "vitest";

import { HintsOrErrors } from "./HintOrErrors";

const tMock = (key: string) => key;

// Mock useFormContext to return controlled formState
const mockFormState = {
  dirtyFields: {} as Record<string, boolean>,
  touchedFields: {} as Record<string, boolean>,
  errors: {} as Record<string, unknown>,
  isSubmitted: false,
};

vi.mock("react-hook-form", async () => {
  const actual = await vi.importActual("react-hook-form");
  return {
    ...actual,
    useFormContext: () => ({
      formState: mockFormState,
    }),
  };
});

function resetFormState() {
  mockFormState.dirtyFields = {};
  mockFormState.touchedFields = {};
  mockFormState.errors = {};
  mockFormState.isSubmitted = false;
}

describe("HintsOrErrors", () => {
  beforeEach(() => {
    resetFormState();
  });

  describe("when no hintErrors and no field errors", () => {
    test("renders nothing", () => {
      const { container } = render(<HintsOrErrors fieldName="password" t={tMock} />);
      expect(container.innerHTML).toBe("");
    });
  });

  describe("hints-only mode (no errors)", () => {
    test("renders hint items with circle icons when field is pristine", () => {
      render(<HintsOrErrors hintErrors={["caplow", "min", "num"]} fieldName="password" t={tMock} />);

      expect(screen.getByText("password_hint_caplow")).toBeInTheDocument();
      expect(screen.getByText("password_hint_min")).toBeInTheDocument();
      expect(screen.getByText("password_hint_num")).toBeInTheDocument();

      const items = screen.getAllByRole("listitem");
      items.forEach((item) => {
        expect(item).not.toHaveClass("text-green-600");
      });
    });

    test("shows green check when field is dirty AND touched", () => {
      mockFormState.dirtyFields = { password: true };
      mockFormState.touchedFields = { password: true };

      render(<HintsOrErrors hintErrors={["caplow", "min"]} fieldName="password" t={tMock} />);

      const items = screen.getAllByRole("listitem");
      items.forEach((item) => {
        expect(item).toHaveClass("text-green-600");
      });
    });

    test("shows green check when field is dirty AND form is submitted", () => {
      mockFormState.dirtyFields = { password: true };
      mockFormState.isSubmitted = true;

      render(<HintsOrErrors hintErrors={["caplow", "min"]} fieldName="password" t={tMock} />);

      const items = screen.getAllByRole("listitem");
      items.forEach((item) => {
        expect(item).toHaveClass("text-green-600");
      });
    });

    test("does NOT show checks when dirty but NOT touched and NOT submitted", () => {
      mockFormState.dirtyFields = { password: true };

      render(<HintsOrErrors hintErrors={["caplow"]} fieldName="password" t={tMock} />);

      const item = screen.getByRole("listitem");
      expect(item).not.toHaveClass("text-green-600");
    });

    test("does NOT show checks when touched but NOT dirty", () => {
      mockFormState.touchedFields = { password: true };

      render(<HintsOrErrors hintErrors={["caplow"]} fieldName="password" t={tMock} />);

      const item = screen.getByRole("listitem");
      expect(item).not.toHaveClass("text-green-600");
    });
  });

  describe("hints with field errors (validation failures)", () => {
    test("shows X icon with error color for failing rules after submission", () => {
      mockFormState.errors = {
        password: {
          caplow: { type: "caplow", message: "Need uppercase" },
        },
      };
      mockFormState.isSubmitted = true;

      render(<HintsOrErrors hintErrors={["caplow", "min"]} fieldName="password" t={tMock} />);

      const items = screen.getAllByTestId("hint-error");
      expect(items).toHaveLength(2);

      // caplow has an error → should show text-error after submit
      expect(items[0]).toHaveClass("text-error");

      // min has no error → should show green (passed)
      expect(items[1]).toHaveClass("text-green-600");
    });

    test("shows circle icons for errors before submission (no color)", () => {
      mockFormState.errors = {
        password: {
          caplow: { type: "caplow", message: "Need uppercase" },
        },
      };
      mockFormState.isSubmitted = false;

      render(<HintsOrErrors hintErrors={["caplow", "min"]} fieldName="password" t={tMock} />);

      const items = screen.getAllByTestId("hint-error");
      // caplow has error but not submitted → no text-error, no text-green
      expect(items[0]).not.toHaveClass("text-error");
      expect(items[0]).not.toHaveClass("text-green-600");
    });
  });

  describe("custom field errors without hintErrors", () => {
    test("renders custom error keys as blue hints", () => {
      mockFormState.errors = {
        password: {
          customRule: { type: "customRule", message: "" },
        },
      };

      render(<HintsOrErrors fieldName="password" t={tMock} />);

      expect(screen.getByText("password_hint_customRule")).toBeInTheDocument();
      const item = screen.getByRole("listitem");
      expect(item).toHaveClass("text-blue-700");
    });
  });

  describe("simple field error with message", () => {
    test("renders InputError when fieldErrors has a message string", () => {
      mockFormState.errors = {
        password: {
          message: "Password is required",
        },
      };

      render(<HintsOrErrors fieldName="password" t={tMock} />);

      expect(screen.getByTestId("field-error")).toBeInTheDocument();
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });
});
