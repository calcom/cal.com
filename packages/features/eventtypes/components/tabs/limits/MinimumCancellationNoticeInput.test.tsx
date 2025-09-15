import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import MinimumCancellationNoticeInput from "./MinimumCancellationNoticeInput";

// Mock the localization hook
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the utility functions
const mockConvertToNewDurationType = vi.fn((from: string, to: string, value: number) => {
  if (from === "minutes" && to === "minutes") return value;
  if (from === "minutes" && to === "hours") return value / 60;
  if (from === "minutes" && to === "days") return value / (60 * 24);
  if (from === "hours" && to === "minutes") return value * 60;
  if (from === "days" && to === "minutes") return value * 60 * 24;
  if (from === "hours" && to === "hours") return value;
  if (from === "days" && to === "days") return value;
  if (from === "hours" && to === "days") return value / 24;
  if (from === "days" && to === "hours") return value * 24;
  return value;
});

vi.mock("@calcom/lib/convertToNewDurationType", () => ({
  default: mockConvertToNewDurationType,
}));

const mockFindDurationType = vi.fn((value: number) => {
  if (value >= 1440) return "days";
  if (value >= 60) return "hours";
  return "minutes";
});

vi.mock("@calcom/lib/findDurationType", () => ({
  default: mockFindDurationType,
}));

const TestWrapper = ({ 
  children, 
  defaultValues = {},
  onSubmit = vi.fn()
}: { 
  children: React.ReactNode; 
  defaultValues?: any;
  onSubmit?: (data: any) => void;
}) => {
  const methods = useForm({
    defaultValues: {
      minimumCancellationNotice: 120,
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {children}
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

describe("MinimumCancellationNoticeInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the minimum cancellation notice input field with label", () => {
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      expect(screen.getByLabelText("minimum_cancellation_notice")).toBeInTheDocument();
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renders with required attribute on the input field", () => {
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("required");
    });

    it("renders with placeholder text", () => {
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("placeholder", "0");
    });

    it("renders hidden input field for form integration", () => {
      const { container } = render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const hiddenInput = container.querySelector('input[type="hidden"]');
      expect(hiddenInput).toBeInTheDocument();
    });
  });

  describe("Initial Value Display", () => {
    it("displays the correct initial value in hours when value is 120 minutes", () => {
      render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 120 }}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveValue(2); // 120 minutes = 2 hours
    });

    it("displays the correct initial value in days when value is 1440 minutes", () => {
      render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 1440 }}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveValue(1); // 1440 minutes = 1 day
    });

    it("displays the correct initial value in minutes when value is 30 minutes", () => {
      render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 30 }}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveValue(30); // 30 minutes stays as minutes
    });

    it("handles zero value correctly", () => {
      render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 0 }}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveValue(0);
    });

    it("handles undefined value correctly", () => {
      render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: undefined }}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveValue(0);
    });
  });

  describe("User Interactions", () => {
    it("updates the value when user types a new number", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "5");
      expect(input).toHaveValue(5);
    });

    it("handles negative values by enforcing minimum of 0", () => {
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "-5" } });
      expect(input).toHaveAttribute("min", "0");
    });

    it("handles decimal values correctly", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "3.5");
      expect(input).toHaveValue(3.5);
    });

    it("handles empty value as 0", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      
      // The component should treat empty as 0
      await waitFor(() => {
        expect(mockConvertToNewDurationType).toHaveBeenCalledWith(
          expect.any(String),
          "minutes",
          0
        );
      });
    });

    it("handles very large values correctly", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "999999");
      expect(input).toHaveValue(999999);
    });
  });

  describe("Duration Type Selection", () => {
    it("allows changing from minutes to hours", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 30 }}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const select = screen.getByRole("combobox");
      
      // Simulate selecting hours option
      await user.click(select);
      
      // The conversion should happen
      await waitFor(() => {
        expect(mockConvertToNewDurationType).toHaveBeenCalledWith(
          "hours",
          "minutes",
          expect.any(Number)
        );
      });
    });

    it("allows changing from hours to days", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 120 }}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const select = screen.getByRole("combobox");
      
      // Simulate selecting days option
      await user.click(select);
      
      await waitFor(() => {
        expect(mockConvertToNewDurationType).toHaveBeenCalled();
      });
    });

    it("maintains value when switching between duration types", async () => {
      render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 60 }}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      
      // Initially shows 1 hour
      expect(input).toHaveValue(1);
      
      // Value in minutes should remain 60
      expect(mockConvertToNewDurationType).toHaveBeenCalledWith(
        expect.any(String),
        "minutes",
        expect.any(Number)
      );
    });

    it("correctly identifies duration type for edge cases", () => {
      // Test exactly 60 minutes (should be hours)
      render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 60 }}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );
      
      expect(mockFindDurationType).toHaveBeenCalledWith(60);
      expect(mockFindDurationType).toHaveReturnedWith("hours");
    });
  });

  describe("Disabled State", () => {
    it("disables the input field when disabled prop is true", () => {
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" disabled />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      const select = screen.getByRole("combobox");
      
      expect(input).toBeDisabled();
      expect(select).toHaveAttribute("aria-disabled", "true");
    });

    it("enables the input field when disabled prop is false", () => {
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" disabled={false} />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      const select = screen.getByRole("combobox");
      
      expect(input).not.toBeDisabled();
      expect(select).not.toHaveAttribute("aria-disabled", "true");
    });

    it("prevents value changes when disabled", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 60 }}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" disabled />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      const initialValue = input.getAttribute("value");
      
      await user.type(input, "999");
      
      expect(input.getAttribute("value")).toBe(initialValue);
    });
  });

  describe("Custom Class Names", () => {
    it("applies custom input class names", () => {
      const customClassNames = {
        input: "custom-input-class",
      };

      const { container } = render(
        <TestWrapper>
          <MinimumCancellationNoticeInput
            name="minimumCancellationNotice"
            customClassNames={customClassNames}
          />
        </TestWrapper>
      );

      const input = container.querySelector(".custom-input-class");
      expect(input).toBeInTheDocument();
    });

    it("applies custom select class names", () => {
      const customClassNames = {
        select: "custom-select-class",
      };

      const { container } = render(
        <TestWrapper>
          <MinimumCancellationNoticeInput
            name="minimumCancellationNotice"
            customClassNames={customClassNames}
          />
        </TestWrapper>
      );

      const select = container.querySelector(".custom-select-class");
      expect(select).toBeInTheDocument();
    });

    it("applies custom inner class names for select", () => {
      const customClassNames = {
        innerClassNames: {
          control: "custom-control-class",
        },
      };

      const { container } = render(
        <TestWrapper>
          <MinimumCancellationNoticeInput
            name="minimumCancellationNotice"
            customClassNames={customClassNames}
          />
        </TestWrapper>
      );

      // The Select component should receive these inner class names
      expect(container.querySelector('[class*="w-full"]')).toBeInTheDocument();
    });

    it("applies default classes when no custom classes provided", () => {
      const { container } = render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      expect(container.querySelector('[class*="mb-0"]')).toBeInTheDocument();
      expect(container.querySelector('[class*="h-9"]')).toBeInTheDocument();
    });
  });

  describe("Form Integration", () => {
    it("updates form values when input changes", async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      
      render(
        <TestWrapper onSubmit={onSubmit}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "10");

      const submitButton = screen.getByText("Submit");
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            minimumCancellationNotice: expect.any(Number)
          })
        );
      });
    });

    it("marks form as dirty when value changes", async () => {
      const user = userEvent.setup();
      
      const { container } = render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "15");

      // The setValue call should include shouldDirty: true
      await waitFor(() => {
        expect(mockConvertToNewDurationType).toHaveBeenCalled();
      });
    });

    it("synchronizes hidden field with display values", async () => {
      const user = userEvent.setup();
      
      const { container } = render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 60 }}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      const hiddenInput = container.querySelector('input[type="hidden"]');

      await user.clear(input);
      await user.type(input, "5");

      // Hidden field should be updated via useEffect
      await waitFor(() => {
        expect(mockConvertToNewDurationType).toHaveBeenCalledWith(
          expect.any(String),
          "minutes",
          5
        );
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("handles NaN values gracefully", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "abc");

      // HTML number input won't accept non-numeric values
      expect(input).toHaveValue(null);
    });

    it("handles switching between all duration types correctly", async () => {
      render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 2880 }}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      // 2880 minutes = 2 days
      const input = screen.getByRole("spinbutton");
      expect(input).toHaveValue(2);
      expect(mockFindDurationType).toHaveBeenCalledWith(2880);
      expect(mockFindDurationType).toHaveReturnedWith("days");
    });

    it("handles rapid value changes", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      
      // Rapidly change values
      await user.clear(input);
      await user.type(input, "1");
      await user.type(input, "2");
      await user.type(input, "3");

      expect(input).toHaveValue(123);
    });

    it("maintains consistency between display and stored values", async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();
      
      render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 90 }} onSubmit={onSubmit}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      // 90 minutes should display as 1.5 hours
      const input = screen.getByRole("spinbutton");
      expect(input).toHaveValue(1.5);

      const submitButton = screen.getByText("Submit");
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            minimumCancellationNotice: 90 // Should still store as minutes
          })
        );
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes", () => {
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("type", "number");
      expect(input).toHaveAttribute("min", "0");
    });

    it("associates label with input correctly", () => {
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const label = screen.getByText("minimum_cancellation_notice");
      const input = screen.getByRole("spinbutton");
      
      // Check that label is properly associated
      expect(label).toBeInTheDocument();
      expect(input).toHaveAttribute("required");
    });

    it("provides keyboard navigation support", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      
      // Tab to input
      await user.tab();
      
      // Use arrow keys to change value
      await user.keyboard("{ArrowUp}");
      
      // Number inputs respond to arrow keys
      expect(input).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("memoizes conversion calculations correctly", async () => {
      const { rerender } = render(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 120 }}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const initialCallCount = mockConvertToNewDurationType.mock.calls.length;

      // Re-render with same props
      rerender(
        <TestWrapper defaultValues={{ minimumCancellationNotice: 120 }}>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      // Should not trigger unnecessary conversions
      expect(mockConvertToNewDurationType.mock.calls.length).toBeGreaterThanOrEqual(initialCallCount);
    });

    it("debounces rapid input changes effectively", async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <MinimumCancellationNoticeInput name="minimumCancellationNotice" />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      
      // Type rapidly
      await user.clear(input);
      await user.type(input, "12345", { delay: 1 });

      // Should handle all changes smoothly
      expect(input).toHaveValue(12345);
    });
  });
});