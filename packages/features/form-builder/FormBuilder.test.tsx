import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { vi } from "vitest";

import { FormBuilder } from "./FormBuilder";
import {
  mockProps,
  verifier,
  setMockIntersectionObserver,
  setMockMatchMedia,
  pageObject,
  expectScenario,
  getLocationBookingField,
} from "./testUtils";

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

const renderComponent = ({
  formBuilderProps: formBuilderProps,
  formDefaultValues: formDefaultValues,
}: {
  formBuilderProps: Parameters<typeof FormBuilder>[0];
  formDefaultValues;
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
});
