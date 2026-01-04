import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { vi } from "vitest";

import { showToast } from "@calcom/ui/components/toast";

import { FormBuilder } from "./FormBuilder";
import {
  mockProps as mockPropsBase,
  verifier,
  setMockIntersectionObserver,
  setMockMatchMedia,
  pageObject,
  expectScenario,
  getLocationBookingField,
} from "@calcom/features/form-builder/testUtils";

// Re-type mockProps to ensure LockedIcon is typed as `false` instead of `boolean`
const mockProps = { ...mockPropsBase, LockedIcon: false as const };

vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: vi.fn(() => ({
      push: vi.fn(() => {
        return;
      }),
    })),
  };
});

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

const renderComponent = ({
  formBuilderProps: formBuilderProps,
  formDefaultValues: formDefaultValues,
}: {
  formBuilderProps: Parameters<typeof FormBuilder>[0];
  formDefaultValues: { [x: string]: {} | undefined };
}) => {
  const Wrapper = ({ children }: { children: ReactNode }) => {
    const form = useForm({
      defaultValues: formDefaultValues,
    });
    return (
      <TooltipProvider>
        <FormProvider {...form}>{children}</FormProvider>
      </TooltipProvider>
    );
  };

  return render(<FormBuilder {...formBuilderProps} />, { wrapper: Wrapper });
};

describe("FormBuilder", () => {
  beforeAll(() => {
    setMockMatchMedia();
    setMockIntersectionObserver();
  });

  describe("Basic Tests", () => {
    const fieldTypes = [
      { fieldType: "email", label: "Email Field" },
      { fieldType: "phone", label: "Phone Field" },
      { fieldType: "address", label: "Address Field" },
      { fieldType: "text", label: "Short Text Field" },
      { fieldType: "number", label: "Number Field" },
      { fieldType: "textarea", label: "LongText Field" },
      { fieldType: "select", label: "Select Field" },
      { fieldType: "multiselect", label: "MultiSelect Field" },
      { fieldType: "multiemail", label: "Multiple Emails Field" },
      { fieldType: "checkbox", label: "CheckBox Group Field" },
      { fieldType: "radio", label: "Radio Group Field" },
      { fieldType: "boolean", label: "Checkbox Field" },
    ];
    beforeEach(() => {
      renderComponent({ formBuilderProps: mockProps, formDefaultValues: {} });
    });

    for (const { fieldType, label } of fieldTypes) {
      it(`Should add new field of type ${fieldType} `, async () => {
        const defaultIdentifier = `${fieldType}-id`;
        const newIdentifier = `${defaultIdentifier}-edited`;

        await verifier.verifyFieldAddition({
          fieldType,
          identifier: defaultIdentifier,
          label,
        });

        await verifier.verifyIdentifierChange({
          newIdentifier: newIdentifier,
          existingIdentifier: defaultIdentifier,
        });

        await verifier.verifyThatFieldCanBeMarkedOptional({
          identifier: newIdentifier,
        });

        await verifier.verifyFieldToggle({ identifier: newIdentifier });

        await verifier.verifyFieldDeletion({ identifier: newIdentifier });
      });
    }
  });

  describe("radioInput type field with options available in dataStore", () => {
    test('Should add new field of type "radioInput" and select option from dataStore', async () => {
      const field = {
        identifier: "location",
        type: "radioInput",
      };
      renderComponent({
        formBuilderProps: {
          ...mockProps,
          dataStore: {
            options: {
              locations: {
                value: [
                  {
                    label: "Attendee Phone",
                    value: "phone",
                    inputPlaceholder: "Phone Number",
                  },
                ],
                source: { label: "Location" },
              },
            },
          },
          // @typescript-eslint/no-explicit-any
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          shouldConsiderRequired: (field: any) => {
            return field.name === "location" ? true : false;
          },
        },
        formDefaultValues: {
          fields: [getLocationBookingField()],
        },
      });

      // editable:'system' field can't be deleted
      expectScenario.toNotHaveDeleteButton({ identifier: field.identifier });
      // editable:'system' field can't be toggled
      expectScenario.toNotHaveToggleButton({ identifier: field.identifier });
      expectScenario.toHaveSourceBadge({ identifier: field.identifier, sourceLabel: "1 Location" });
      expectScenario.toHaveRequiredBadge({ identifier: field.identifier });

      const newFieldDialog = pageObject.openAddFieldDialog();

      // radioInput type field isn't selectable by the user.
      expect(
        pageObject.dialog.fieldTypeDropdown.queryOptionForFieldType({
          dialog: newFieldDialog,
          fieldType: "radioInput",
        })
      ).toBeNull();

      pageObject.dialog.close({ dialog: newFieldDialog });

      const dialog = pageObject.openEditFieldDialog({ identifier: field.identifier });

      expectScenario.toHaveFieldTypeDropdownDisabled({ dialog });
      expectScenario.toHaveIdentifierChangeDisabled({ dialog });
      expectScenario.toHaveRequirablityToggleDisabled({ dialog });
      expectScenario.toHaveLabelChangeAllowed({ dialog });
      expect(pageObject.dialog.isFieldShowingAsRequired({ dialog })).toBe(true);
    });
  });

  describe("Addon Fields Tests", () => {
    beforeEach(() => {
      renderComponent({
        formBuilderProps: {
          ...mockProps,
          showPriceField: true,
        },
        formDefaultValues: {},
      });
    });

    it("Should add number field with price", async () => {
      const identifier = "quantity-addon";
      const price = 10;
      await verifier.verifyFieldAddition({
        fieldType: "number",
        identifier,
        label: "Quantity",
        price,
      });

      pageObject.openEditFieldDialog({ identifier });
      await expectScenario.toHavePriceField({ identifier, price });
    });

    it("Should add boolean field with price", async () => {
      const identifier = "extra-service-addon";
      const price = 15;
      await verifier.verifyFieldAddition({
        fieldType: "boolean",
        identifier,
        label: "Extra Service",
        price,
      });

      pageObject.openEditFieldDialog({ identifier });
      await expectScenario.toHavePriceField({ identifier, price });
    });

    it("Should add select field with price and options", async () => {
      const identifier = "meal-selection";
      await verifier.verifyFieldAddition({
        fieldType: "select",
        identifier,
        label: "Meal Selection",
        options: [
          { label: "Vegetarian", value: "veg", price: 20 },
          { label: "Non-Vegetarian", value: "non-veg", price: 25 },
        ],
      });

      verifier.verifyOptionPrices({ identifier, prices: [20, 25] });
    });

    it("Should add multiselect field with price and options", async () => {
      const identifier = "add-ons";
      await verifier.verifyFieldAddition({
        fieldType: "multiselect",
        identifier,
        label: "Add-ons",
        options: [
          { label: "WiFi", value: "wifi", price: 10 },
          { label: "Breakfast", value: "breakfast", price: 15 },
          { label: "Parking", value: "parking", price: 20 },
        ],
      });

      verifier.verifyOptionPrices({ identifier, prices: [10, 15, 20] });
    });

    it("Should add checkbox group field with price and options", async () => {
      const identifier = "amenities";
      await verifier.verifyFieldAddition({
        fieldType: "checkbox",
        identifier,
        label: "Amenities",
        options: [
          { label: "Pool Access", value: "pool", price: 15 },
          { label: "Gym Access", value: "gym", price: 20 },
          { label: "Spa Access", value: "spa", price: 25 },
        ],
      });

      verifier.verifyOptionPrices({ identifier, prices: [15, 20, 25] });
    });

    it("Should add radio group field with price and options", async () => {
      const identifier = "room-type";
      await verifier.verifyFieldAddition({
        fieldType: "radio",
        identifier,
        label: "Room Type",
        options: [
          { label: "Standard", value: "standard", price: 50 },
          { label: "Deluxe", value: "deluxe", price: 75 },
          { label: "Suite", value: "suite", price: 100 },
        ],
      });

      verifier.verifyOptionPrices({ identifier, prices: [50, 75, 100] });
    });
  });

  describe("Guests Field Validation Tests", () => {
    beforeEach(() => {
      renderComponent({ formBuilderProps: mockProps, formDefaultValues: {} });
    });

    it("Should prevent saving guests field with non-multiemail type", async () => {
      const dialog = pageObject.openAddFieldDialog();

      pageObject.dialog.selectFieldType({ dialog, fieldType: "text" });
      pageObject.dialog.fillInFieldIdentifier({ dialog, identifier: "guests" });
      pageObject.dialog.fillInFieldLabel({ dialog, label: "Guests", fieldType: "text" });

      pageObject.dialog.saveField({ dialog });

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith("guests_field_must_be_multiemail", "error");
      });

      expect(screen.queryByTestId("field-guests")).not.toBeInTheDocument();
    });

    it("Should allow saving guests field with multiemail type", async () => {
      const dialog = pageObject.openAddFieldDialog();

      pageObject.dialog.selectFieldType({ dialog, fieldType: "multiemail" });
      pageObject.dialog.fillInFieldIdentifier({ dialog, identifier: "guests" });
      pageObject.dialog.fillInFieldLabel({ dialog, label: "Guests", fieldType: "multiemail" });

      pageObject.dialog.saveField({ dialog });

      await waitFor(() => {
        expect(screen.getByTestId("field-guests")).toBeInTheDocument();
      });
    });
  });
});
