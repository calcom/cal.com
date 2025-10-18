import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { vi } from "vitest";

import { FormBuilderField } from "./FormBuilderField";

vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

const renderComponent = ({
  props: props,
  formDefaultValues,
}: {
  props: Parameters<typeof FormBuilderField>[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formDefaultValues?: any;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let formMethods: UseFormReturn<any> | undefined;
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const form = useForm({
      defaultValues: formDefaultValues,
    });
    formMethods = form;
    return <FormProvider {...form}>{children}</FormProvider>;
  };
  render(<FormBuilderField {...props} />, { wrapper: Wrapper });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { formMethods: formMethods! };
};

describe("FormBuilderField", () => {
  it("verify a text type input field", () => {
    const { formMethods } = renderComponent({
      props: {
        field: {
          name: "textInput1",
          type: "text",
          label: "Text Input 1",
          placeholder: "Enter text",
        },
        readOnly: false,
        className: "",
      },
      formDefaultValues: {},
    });
    expect(component.getFieldInput({ label: "Text Input 1" }).value).toEqual("");
    component.fillFieldInput({ label: "Text Input 1", value: "test" });
    expectScenario.toHaveFieldValue({
      label: "Text Input 1",
      identifier: "textInput1",
      value: "test",
      formMethods,
    });
  });

  it("verify a date type input field", async () => {
    const { formMethods } = renderComponent({
      props: {
        field: {
          name: "eventDate",
          type: "date",
          label: "Event Date",
          required: true,
        },
        readOnly: false,
        className: "",
      },
      formDefaultValues: {},
    });

    // Generate a date in the current month (15th day to avoid month-end edge cases)
    const today = new Date();
    const testDate = new Date(today.getFullYear(), today.getMonth(), 15);
    const year = testDate.getFullYear();
    const month = String(testDate.getMonth() + 1).padStart(2, "0");
    const day = String(testDate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    // Test date field rendering
    expect(component.getDateField({ label: "Event Date" })).toBeInTheDocument();

    // Test date selection
    await component.selectDate({ label: "Event Date", value: formattedDate });

    await expectScenario.toHaveDateFieldValue({
      label: "Event Date",
      identifier: "eventDate",
      value: formattedDate,
      formMethods,
    });
  });
});

const component = {
  getFieldInput: ({ label }: { label: string }) =>
    screen.getByRole("textbox", { name: label }) as HTMLInputElement,

  fillFieldInput: ({ label, value }: { label: string; value: string }) => {
    fireEvent.change(component.getFieldInput({ label }), { target: { value } });
  },

  getDateField: ({ label }: { label: string }) => {
    return screen.getByTestId("pick-date");
  },

  selectDate: async ({ label, value }: { label: string; value: string }) => {
    const user = userEvent.setup();
    const [year, month, day] = value.split("-").map(Number);

    // Click to open the date picker
    const dateButton = screen.getByTestId("pick-date");
    await user.click(dateButton);

    // Wait for the Radix Popover content to appear
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const calendar = screen.getByRole("dialog");

    // Find all day buttons (they have role="gridcell" and name="day")
    const dayButtons = within(calendar).getAllByRole("gridcell");

    // Find the button with matching text content for the day
    const dayButton = dayButtons.find(button => {
      const buttonText = button.textContent?.trim();
      return buttonText === day.toString();
    });

    if (!dayButton) {
      throw new Error(`Could not find day button for day ${day}`);
    }

    await user.click(dayButton);

    // Wait a bit for the state to update (the popover may stay open, which is fine)
    await waitFor(() => {
      const updatedButton = screen.getByTestId("pick-date");
      expect(updatedButton.textContent).not.toBe("Pick a date");
    });
  },
};

const expectScenario = {
  toHaveFieldValue: ({
    identifier,
    label,
    value,
    formMethods,
  }: {
    identifier: string;
    label: string;
    value: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formMethods: UseFormReturn<any>;
  }) => {
    expect(component.getFieldInput({ label }).value).toEqual(value);
    expect(formMethods.getValues(`responses.${identifier}`)).toEqual(value);
  },

  toHaveDateFieldValue: async ({
    identifier,
    label,
    value,
    formMethods,
  }: {
    identifier: string;
    label: string;
    value: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formMethods: UseFormReturn<any>;
  }) => {
    const dateButton = component.getDateField({ label });
    expect(dateButton).toBeInTheDocument();

    // Check that the button now shows a formatted date instead of "Pick a date"
    await waitFor(() => {
      expect(dateButton.textContent).not.toBe("Pick a date");
    });

    // Verify the form value
    await waitFor(() => {
      expect(formMethods.getValues(`responses.${identifier}`)).toEqual(value);
    });
  },
};