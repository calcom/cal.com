import { fireEvent, waitFor, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";

export interface FieldProps {
  fieldType: string;
  identifier: string;
  label: string;
  price?: number;
  options?: { label: string; value: string; price?: number }[];
}

export const mockProps = {
  formProp: "fields",
  title: "FormBuilder Title",
  description: "FormBuilder Description",
  addFieldLabel: "Add Field",
  disabled: false,
  LockedIcon: false,
  dataStore: { options: {} },
};

export const getLocationBookingField = () => {
  const bookingFields = getBookingFieldsWithSystemFields({
    bookingFields: [],
    disableGuests: false,
    disableBookingTitle: false,
    customInputs: [],
    metadata: {},
    workflows: [],
  });

  const locationBookingField = bookingFields.find((field) => field.name === "location");
  if (!locationBookingField) {
    throw new Error("location booking field not found");
  }
  return locationBookingField;
};

export const setMockMatchMedia = () => {
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

export const setMockIntersectionObserver = () => {
  Object.defineProperty(window, "IntersectionObserver", {
    value: vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn(() => []),
    })),
  });
};

type TestingLibraryElement = ReturnType<typeof within>;

const getFieldDomElementInTheList = ({ identifier }: { identifier: string }) => {
  return screen.getByTestId(`field-${identifier}`);
};

const queryFieldDomElementInTheList = ({ identifier }: { identifier: string }) => {
  return screen.queryByTestId(`field-${identifier}`);
};

const getFieldInTheList = ({ identifier }: { identifier: string }) => {
  const domElement = getFieldDomElementInTheList({ identifier });
  return within(domElement);
};

const getEditDialogForm = () => {
  const formBuilder = document.getElementById("form-builder");
  if (!formBuilder) {
    throw new Error("Form Builder not found");
  }
  return within(formBuilder);
};

export const pageObject = {
  openAddFieldDialog: () => {
    fireEvent.click(screen.getByTestId("add-field"));
    return getEditDialogForm();
  },
  openEditFieldDialog: ({ identifier }: { identifier: string }) => {
    fireEvent.click(getFieldInTheList({ identifier }).getByTestId("edit-field-action"));
    return getEditDialogForm();
  },
  dialog: {
    isFieldShowingAsRequired: ({ dialog }: { dialog: TestingLibraryElement }) => {
      const checkbox = dialog.getByTestId("field-required") as HTMLInputElement;
      return checkbox.checked;
    },
    makeFieldOptional: ({ dialog }: { dialog: TestingLibraryElement }) => {
      const checkbox = dialog.getByTestId("field-required") as HTMLInputElement;
      if (checkbox.checked) {
        fireEvent.click(checkbox);
      }
    },
    makeFieldRequired: ({ dialog }: { dialog: TestingLibraryElement }) => {
      const checkbox = dialog.getByTestId("field-required") as HTMLInputElement;
      if (!checkbox.checked) {
        fireEvent.click(checkbox);
      }
    },
    queryIdentifierInput: ({ dialog }: { dialog: TestingLibraryElement }) => {
      return dialog.getByLabelText("identifier");
    },
    saveField: ({ dialog }: { dialog: ReturnType<typeof within> }) => {
      fireEvent.click(dialog.getByTestId("field-add-save"));
    },
    openFieldTypeDropdown: ({ dialog }: { dialog: TestingLibraryElement }) => {
      fireEvent.keyDown(dialog.getByTestId("test-field-type"), { key: "ArrowDown", code: "ArrowDown" });
    },
    fieldTypeDropdown: {
      queryOptionForFieldType: ({
        dialog,
        fieldType,
      }: {
        dialog: TestingLibraryElement;
        fieldType: string;
      }) => {
        const fieldTypeEl = within(dialog.getByTestId("test-field-type"));
        return fieldTypeEl.queryByTestId(`select-option-${fieldType}`);
      },
      queryAllOptions: ({ dialog }: { dialog: TestingLibraryElement }) => {
        const fieldTypeElementWithOptions = within(dialog.getByTestId("test-field-type").parentElement);
        return fieldTypeElementWithOptions.queryAllByTestId(/^select-option-/);
      },
    },
    selectFieldType: ({ dialog, fieldType }: { dialog: TestingLibraryElement; fieldType: string }) => {
      pageObject.dialog.openFieldTypeDropdown({ dialog });
      fireEvent.click(dialog.getByTestId(`select-option-${fieldType}`));
    },
    fillInFieldIdentifier: ({
      dialog,
      identifier,
    }: {
      dialog: TestingLibraryElement;
      identifier: string;
    }) => {
      fireEvent.change(dialog.getAllByRole("textbox")[0], { target: { value: identifier } });
    },
    fillInFieldLabel: ({
      dialog,
      label,
      fieldType,
    }: {
      dialog: TestingLibraryElement;
      label: string;
      fieldType: string;
    }) => {
      if (fieldType !== "boolean") {
        fireEvent.change(dialog.getAllByRole("textbox")[1], { target: { value: label } });
      }
    },
    fillInPrice: ({ dialog, price }: { dialog: TestingLibraryElement; price: number }) => {
      // The price input is rendered with an Input component with a $ suffix
      const priceInput = dialog.getByRole("spinbutton");
      fireEvent.change(priceInput, { target: { value: price.toString() } });
    },
    addOption: ({ dialog }: { dialog: TestingLibraryElement }) => {
      fireEvent.click(dialog.getByTestId("add-option"));
    },
    fillInOption: async ({
      dialog,
      index,
      label,
      price,
    }: {
      dialog: TestingLibraryElement;
      index: number;
      label: string;
      price?: number;
    }) => {
      pageObject.dialog.addOption({ dialog });

      const optionInputs = dialog.getByTestId("options-container");
      await waitFor(() => {
        const listItems = optionInputs.querySelectorAll("li");
        expect(listItems.length).toBeGreaterThan(index);
        const optionInput = within(listItems[index]).getByRole("textbox");
        expect(optionInput).toBeInTheDocument();
        fireEvent.change(optionInput, { target: { value: label } });
      });

      if (price !== undefined) {
        await waitFor(() => {
          const listItems = optionInputs.querySelectorAll("li");
          expect(listItems.length).toBeGreaterThan(index);
          const priceInput = within(listItems[index]).getByRole("spinbutton");
          expect(priceInput).toBeInTheDocument();
          fireEvent.change(priceInput, { target: { value: price.toString() } });
        });
      }
    },
    close: ({ dialog }: { dialog: TestingLibraryElement }) => {
      fireEvent.click(dialog.getByTestId("dialog-rejection"));
    },
  },
  queryDeleteButton: ({ identifier }: { identifier: string }) => {
    const field = getFieldInTheList({ identifier });
    return field.queryByTestId("delete-field-action");
  },
  getDeleteButton: ({ identifier }: { identifier: string }) => {
    const field = getFieldInTheList({ identifier });
    return field.queryByTestId("delete-field-action");
  },
  deleteField: ({ identifier }: { identifier: string }) => {
    const field = getFieldInTheList({ identifier });
    fireEvent.click(field.getByTestId("delete-field-action"));
  },
  queryToggleButton: ({ identifier }: { identifier: string }) => {
    const field = getFieldInTheList({ identifier });
    return field.queryByTestId("toggle-field");
  },
  getToggleButton: ({ identifier }: { identifier: string }) => {
    const field = getFieldInTheList({ identifier });
    return field.getByTestId("toggle-field");
  },
  toggleField: ({ identifier }: { identifier: string }) => {
    const field = getFieldInTheList({ identifier });
    fireEvent.click(field.getByTestId("toggle-field"));
  },
};

export const verifier = {
  verifyFieldAddition: async (props: FieldProps) => {
    const dialog = pageObject.openAddFieldDialog();
    pageObject.dialog.selectFieldType({ dialog, fieldType: props.fieldType });
    pageObject.dialog.fillInFieldIdentifier({ dialog, identifier: props.identifier });
    pageObject.dialog.fillInFieldLabel({ dialog, label: props.label, fieldType: props.fieldType });

    if (props.price !== undefined) {
      pageObject.dialog.fillInPrice({ dialog, price: props.price });
    }

    if (props.options) {
      for (let index = 0; index < props.options.length; index++) {
        const option = props.options[index];
        await pageObject.dialog.fillInOption({
          dialog,
          index,
          label: option.label,
          price: option.price,
        });
      }
    }

    pageObject.dialog.saveField({ dialog: getEditDialogForm() });

    await waitFor(() => {
      expect(getFieldDomElementInTheList({ identifier: props.identifier })).toBeInTheDocument();
    });
  },
  verifyIdentifierChange: async (props: { newIdentifier: string; existingIdentifier: string }) => {
    const dialog = pageObject.openEditFieldDialog({ identifier: props.existingIdentifier });
    pageObject.dialog.fillInFieldIdentifier({ dialog, identifier: props.newIdentifier });
    pageObject.dialog.saveField({ dialog });

    await waitFor(() => {
      expect(getFieldDomElementInTheList({ identifier: props.newIdentifier })).toBeInTheDocument();
      expect(queryFieldDomElementInTheList({ identifier: props.existingIdentifier })).not.toBeInTheDocument();
    });
  },
  verifyFieldDeletion: async ({ identifier }: { identifier: string }) => {
    pageObject.deleteField({ identifier });

    await waitFor(() => {
      expect(queryFieldDomElementInTheList({ identifier })).not.toBeInTheDocument();
    });
  },
  verifyFieldToggle: async ({ identifier }: { identifier: string }) => {
    pageObject.toggleField({ identifier });

    await waitFor(() => {
      expect(screen.queryByText(/hidden/i)).toBeInTheDocument();
    });
  },
  verifyThatFieldCanBeMarkedOptional: async ({ identifier }: { identifier: string }) => {
    expectScenario.toHaveRequiredBadge({ identifier });
    const editDialogForm = pageObject.openEditFieldDialog({ identifier });
    pageObject.dialog.makeFieldOptional({ dialog: editDialogForm });
    pageObject.dialog.saveField({ dialog: editDialogForm });

    await waitFor(() => {
      expect(screen.getByTestId("optional")).toBeInTheDocument();
    });
  },
  verifyOptionPrices: ({ identifier, prices }: { identifier: string; prices: number[] }) => {
    const dialog = pageObject.openEditFieldDialog({ identifier });
    const optionsContainer = dialog.getByTestId("options-container");
    const optionPriceInputs = within(optionsContainer).getAllByRole("spinbutton");
    expect(optionPriceInputs).toHaveLength(prices.length);

    prices.forEach((price, index) => {
      expect(optionPriceInputs[index]).toHaveValue(price);
    });
  },
};

export const expectScenario = {
  toHaveFieldTypeDropdownDisabled: ({ dialog }: { dialog: TestingLibraryElement }) => {
    pageObject.dialog.openFieldTypeDropdown({ dialog });
    const allOptions = pageObject.dialog.fieldTypeDropdown.queryAllOptions({ dialog });
    if (allOptions.length > 0) {
      throw new Error(`Field type dropdown should be disabled`);
    }
  },
  toHaveIdentifierChangeDisabled: ({ dialog }: { dialog: TestingLibraryElement }) => {
    const identifierInput = pageObject.dialog.queryIdentifierInput({ dialog });
    expect(identifierInput.disabled).toBe(true);
  },
  toHaveRequirablityToggleDisabled: ({ dialog }: { dialog: TestingLibraryElement }) => {
    const checkbox = dialog.getByTestId("field-required") as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  },
  toHaveLabelChangeAllowed: ({ dialog }: { dialog: TestingLibraryElement }) => {
    const labelInput = dialog.getByLabelText("label");
    expect(labelInput.disabled).toBe(false);
  },
  toNotHaveDeleteButton: ({ identifier }: { identifier: string }) => {
    expect(pageObject.queryDeleteButton({ identifier })).toBeNull();
  },
  toNotHaveToggleButton: ({ identifier }: { identifier: string }) => {
    expect(pageObject.queryToggleButton({ identifier })).toBeNull();
  },
  toHaveSourceBadge: ({ identifier, sourceLabel }: { identifier: string; sourceLabel: string }) => {
    const field = getFieldInTheList({ identifier });
    expect(field.getByText(sourceLabel)).not.toBeNull();
  },
  toNotHaveOptionalBadge: ({ identifier }: { identifier: string }) => {
    const field = getFieldInTheList({ identifier });
    expect(field.queryByTestId("optional")).toBeNull();
  },
  toHaveRequiredBadge: ({ identifier }: { identifier: string }) => {
    const field = getFieldInTheList({ identifier });
    expect(field.getByText("required")).not.toBeNull();
  },
  toHavePriceField: async ({ identifier, price }: { identifier: string; price: number }) => {
    const dialog = pageObject.openEditFieldDialog({ identifier });
    await waitFor(() => {
      // Find the spinbutton input with $ suffix
      const priceInput = dialog.getByRole("spinbutton");
      expect(priceInput).toBeInTheDocument();
      // Verify the price value is set
      expect(priceInput).toHaveValue(price);
    });
  },
};
