import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, fireEvent, screen } from "@testing-library/react";
import * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import { expect, vi } from "vitest";

import PhoneInput from "@calcom/features/components/phone-input/PhoneInput";

import { getBookingFieldsWithSystemFields } from "../../../lib/getBookingFields";
import { BookingFields } from "./BookingFields";

// Mock PhoneInput to avoid calling the lazy import
vi.mock("@calcom/features/components/phone-input", () => {
  return {
    default: PhoneInput,
  };
});

vi.mock("@calcom/ui/components/address", async (originalImport) => {
  const { AddressInputNonLazy } = (await originalImport()) as Record<string, unknown>;
  // Dynamic imports of Components are not supported in Vitest. So, we use the non-lazy version of the components
  return {
    AddressInput: AddressInputNonLazy,
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormMethods = UseFormReturn<any>;

// Add tRPC mock before tests
vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      public: {
        countryCode: {
          useQuery: () => ({
            data: { countryCode: "US" },
            isLoading: false,
            error: null,
          }),
        },
      },
    },
  },
}));

const renderComponent = ({
  props: props,
  formDefaultValues,
}: {
  props: Parameters<typeof BookingFields>[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formDefaultValues?: any;
}) => {
  let formMethods: UseFormReturn | undefined;
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const form = useForm({
      defaultValues: formDefaultValues,
    });
    formMethods = form;
    return (
      <TooltipProvider>
        <FormProvider {...form}>{children}</FormProvider>
      </TooltipProvider>
    );
  };
  const result = render(<BookingFields {...props} />, { wrapper: Wrapper });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { result, formMethods: formMethods! };
};

describe("BookingFields", () => {
  it("should correctly render with location fields", () => {
    const AttendeePhoneNumberOption = {
      label: "attendee_phone_number",
      value: "phone",
    };

    const OrganizerLinkOption = {
      label: "https://google.com",
      value: "link",
    };

    const locations = [
      {
        type: AttendeePhoneNumberOption.value,
      },
      {
        link: "https://google.com",
        type: OrganizerLinkOption.value,
        displayLocationPublicly: true,
      },
    ];
    const { formMethods } = renderComponent({
      props: {
        fields: getBookingFieldsWithSystemFields({
          disableGuests: false,
          bookingFields: [],
          metadata: null,
          workflows: [],
          customInputs: [],
        }),
        locations,
        isDynamicGroupBooking: false,
        bookingData: null,
      },
      formDefaultValues: {},
    });

    component.fillName({ value: "John Doe" });
    component.fillEmail({ value: "john.doe@example.com" });
    component.fillNotes({ value: "This is a note" });
    expectScenarios.expectNameToBe({ value: "John Doe", formMethods });
    expectScenarios.expectEmailToBe({ value: "john.doe@example.com", formMethods });
    expectScenarios.expectNotesToBe({ value: "This is a note", formMethods });

    component.fillRadioInputLocation({ label: AttendeePhoneNumberOption.label, inputValue: "+1234567890" });
    expectScenarios.expectLocationToBe({
      formMethods,
      label: AttendeePhoneNumberOption.label,
      toMatch: {
        formattedValue: "+1 (234) 567-890",
        value: { optionValue: "+1234567890", value: AttendeePhoneNumberOption.value },
      },
    });

    component.fillRadioInputLocation({ label: OrganizerLinkOption.label });
    expectScenarios.expectLocationToBe({
      formMethods,
      label: OrganizerLinkOption.label,
      toMatch: {
        formattedValue: "+1 (234) 567-890",
        value: { optionValue: "", value: OrganizerLinkOption.value },
      },
    });
  });
});

const component = {
  getName: ({ label = "your_name" }: { label?: string } = {}) =>
    screen.getByRole("textbox", {
      name: new RegExp(label),
    }) as HTMLInputElement,
  getEmail: () => screen.getByRole("textbox", { name: /email/i }) as HTMLInputElement,
  getLocationRadioOption: ({ label }: { label: string }) =>
    screen.getByRole("radio", { name: new RegExp(label) }) as HTMLInputElement,
  getLocationRadioInput: ({ placeholder }: { placeholder: string }) =>
    screen.getByPlaceholderText(placeholder) as HTMLInputElement,
  getNotes: () => screen.getByRole("textbox", { name: /additional_notes/i }) as HTMLInputElement,
  getGuests: () => screen.getByLabelText("guests"),
  fillName: ({ value }: { value: string }) => {
    fireEvent.change(component.getName(), { target: { value } });
  },
  fillEmail: ({ value }: { value: string }) => {
    fireEvent.change(component.getEmail(), { target: { value } });
  },
  fillRadioInputLocation: ({ label, inputValue }: { label: string; inputValue?: string }) => {
    fireEvent.click(component.getLocationRadioOption({ label }));

    if (inputValue) {
      let placeholder = label;
      if (label === "attendee_phone_number") {
        placeholder = "enter_phone_number";
      } else {
        // radioInput doesn't have a label, so we need to identify by placeholder
        throw new Error("Tell me how to identify the placeholder for this location input");
      }
      fireEvent.change(component.getLocationRadioInput({ placeholder }), {
        target: { value: inputValue },
      });
    }
  },
  fillNotes: ({ value }: { value: string }) => {
    fireEvent.change(component.getNotes(), { target: { value } });
  },
};

const expectScenarios = {
  expectNameToBe: ({ value, formMethods }: { value: string; formMethods: FormMethods }) => {
    expect(component.getName().value).toEqual(value);
    expect(formMethods.getValues("responses.name")).toEqual(value);
  },
  expectEmailToBe: ({ value, formMethods }: { value: string; formMethods: FormMethods }) => {
    expect(component.getEmail().value).toEqual(value);
    expect(formMethods.getValues("responses.email")).toEqual(value);
  },
  expectLocationToBe: ({
    formMethods,
    label,
    toMatch: { formattedValue, value },
  }: {
    label: string;
    toMatch: {
      formattedValue?: string;
      value: {
        optionValue: string;
        value: string;
      };
    };
    formMethods: FormMethods;
  }) => {
    expect(component.getLocationRadioOption({ label }).checked).toBe(true);
    if (value.optionValue) {
      expect(component.getLocationRadioInput({ placeholder: "enter_phone_number" }).value).toEqual(
        formattedValue
      );
    }
    expect(formMethods.getValues("responses.location")).toEqual(value);
  },
  expectNotesToBe: ({ value, formMethods }: { value: string; formMethods: FormMethods }) => {
    expect(component.getNotes().value).toEqual(value);
    expect(formMethods.getValues("responses.notes")).toEqual(value);
  },
};
