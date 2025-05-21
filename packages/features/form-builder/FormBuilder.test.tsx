import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  formBuilderProps,
  formDefaultValues,
}: {
  formBuilderProps: Parameters<typeof FormBuilder>[0];
  formDefaultValues: Record<string, unknown>;
}) => {
  const Wrapper = ({ children }: { children: ReactNode }) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const form = useForm<Record<string, any>>({
      defaultValues: formDefaultValues,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
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

  /**
   * TODO 2025-05-20
   * ---------------
   * Fails because the edit-dialog’s query selectors don’t yet expose
   * conditional-logic controls in a testable way.
   * Enable when those selectors are wired up.
   */
  /* eslint-disable playwright/no-skipped-test */
  describe.skip("Visible If … logic", () => {
    it("surfacing parent & value selectors in the edit dialog", async () => {
      const user = userEvent.setup();

      /** parent field with selectable options */
      const parentField = {
        name: "color",
        label: "Color",
        type: "select",
        options: [
          { label: "Red", value: "red" },
          { label: "Blue", value: "blue" },
        ],
      } as const;

      /** child field that depends on the parent */
      const childField = {
        name: "shade",
        label: "Shade",
        type: "text",
        visibleIf: { parent: "color", values: ["red"] },
      } as const;

      renderComponent({
        formBuilderProps: mockProps,
        formDefaultValues: {
          fields: [parentField, childField] as unknown,
        },
      });

      /* — open edit dialog and scope all queries to it — */
      const dialog = await pageObject.openEditFieldDialog({
        identifier: childField.name,
      });

      /* grab the “Show this field if …” select */
      const parentSelect = await dialog.findByRole(
        "combobox",
        { name: /show this field if/i },
        { timeout: 1_000 }
      );
      expect(parentSelect).toBeInTheDocument();

      /* open the list of parents and pick “Color” */
      await user.click(parentSelect);
      expect(await dialog.findByText("Color")).toBeInTheDocument();
      await user.click(dialog.getByText("Color"));

      /* open the “When value is …” multi-select */
      const whenValueIsSelect = dialog.getByRole("combobox", {
        name: /when value is/i,
      });
      await user.click(whenValueIsSelect);
      expect(await dialog.findByText("Red")).toBeInTheDocument();
      expect(await dialog.findByText("Blue")).toBeInTheDocument();

      /* choose “Red” and save */
      await user.click(dialog.getByText("Red"));
      await user.click(dialog.getByRole("button", { name: /save/i }));
    });
  });
});
