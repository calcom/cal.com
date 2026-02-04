import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as Tooltip from "@radix-ui/react-tooltip";
import React from "react";
import type { Mock } from "vitest";
import { vi } from "vitest";

import { Button } from "@calcom/ui/components/button";

import { AttributeForm } from "../AttributesForm";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@calcom/lib/hooks/useCompatSearchParams", () => ({
  useCompatSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
    }),
    usePathname: () => "/settings/organizations/attributes",
  };
});

type InitialOption = {
  id?: string;
  value: string;
  isGroup?: boolean;
  contains?: string[];
  attributeOptionId?: string;
  assignedUsers?: number;
};

// Page Object Functions
const AttributeFormActions = {
  setup: () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn();
    return { user, mockOnSubmit };
  },

  render: (initialOptions: InitialOption[], mockOnSubmit: Mock) => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Tooltip.Provider>{children}</Tooltip.Provider>
    );

    return render(
      <AttributeForm
        onSubmit={mockOnSubmit}
        initialValues={{
          attrName: "Teams",
          type: "MULTI_SELECT",
          options: initialOptions,
        }}
        header={<Button type="submit">Save</Button>}
      />,
      { wrapper }
    );
  },

  addOptionToGroup: async (user: ReturnType<typeof userEvent.setup>) => {
    const selects = await screen.findAllByText("choose_an_option");
    await user.click(selects[0]);
  },

  selectOption: async (user: ReturnType<typeof userEvent.setup>, optionText: string) => {
    const option = await screen.findByText(optionText);
    await user.click(option);
  },

  submitForm: async (user: ReturnType<typeof userEvent.setup>) => {
    const submitButton = screen.getByRole("button", { name: "Save" });
    await user.click(submitButton);
  },

  deleteOption: async (user: ReturnType<typeof userEvent.setup>, index: number) => {
    const deleteButtons = screen.getAllByTitle("remove_option");
    await user.click(deleteButtons[index]);
  },

  expectGroupContainsOptions: async (mockOnSubmit: Mock, groupValue: string, containsIds: string[]) => {
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({
              value: groupValue,
              isGroup: true,
              contains: expect.arrayContaining(containsIds),
            }),
          ]),
        })
      );
    });
  },

  expectGroupNotContainsOptions: async (mockOnSubmit: Mock, groupValue: string, notContainsIds: string[]) => {
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({
              value: groupValue,
              isGroup: true,
              contains: expect.not.arrayContaining(notContainsIds),
            }),
          ]),
        })
      );
    });
  },

  expectDeleteConfirmationDialog: () => {
    expect(screen.getByText("delete_attribute")).toBeInTheDocument();
    expect(screen.getByText("delete_attribute_description")).toBeInTheDocument();
  },

  expectOptionToBeDeleted: async (mockOnSubmit: Mock, optionValue: string) => {
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.not.arrayContaining([
            expect.objectContaining({
              value: optionValue,
            }),
          ]),
        })
      );
    });
  },
};

const initialOptionsWithAGroupHavingOptions: InitialOption[] = [
  { id: "1", value: "Engineering", isGroup: false, attributeOptionId: "1" },
  { id: "2", value: "Design", isGroup: false, attributeOptionId: "2" },
  { id: "3", value: "Product", isGroup: false, attributeOptionId: "3" },
  {
    id: "4",
    value: "Tech Teams",
    isGroup: true,
    contains: ["1", "3"],
    attributeOptionId: "4",
  },
];

const initialOptionsWithAGroupHavingNoOptions: InitialOption[] = [
  { id: "1", value: "Engineering", isGroup: false, attributeOptionId: "1" },
  { id: "2", value: "Design", isGroup: false, attributeOptionId: "2" },
  { id: "3", value: "Product", isGroup: false, attributeOptionId: "3" },
  {
    id: "4",
    value: "Tech Teams",
    isGroup: true,
    contains: [],
    attributeOptionId: "4",
  },
];

describe("AttributeForm", () => {
  describe("Group Options Handling", () => {
    it("should handle adding non-group options to existing group", async () => {
      const { user, mockOnSubmit } = AttributeFormActions.setup();
      AttributeFormActions.render(initialOptionsWithAGroupHavingNoOptions, mockOnSubmit);

      await AttributeFormActions.addOptionToGroup(user);
      await AttributeFormActions.selectOption(user, "Design");
      await AttributeFormActions.submitForm(user);

      await AttributeFormActions.expectGroupContainsOptions(mockOnSubmit, "Tech Teams", ["2"]);
    });

    it("should handle removing options from group when the option is deleted", async () => {
      const { user, mockOnSubmit } = AttributeFormActions.setup();
      AttributeFormActions.render(initialOptionsWithAGroupHavingOptions, mockOnSubmit);

      await AttributeFormActions.deleteOption(user, 0);
      await AttributeFormActions.submitForm(user);
      await AttributeFormActions.expectGroupNotContainsOptions(mockOnSubmit, "Tech Teams", ["1"]);
      await AttributeFormActions.expectOptionToBeDeleted(mockOnSubmit, "Engineering");
    });

    it("should take confirmation before deleting option with assigned users", async () => {
      const { user, mockOnSubmit } = AttributeFormActions.setup();
      const optionsWithAssignedUsers = initialOptionsWithAGroupHavingOptions.map((opt) =>
        opt.value === "Engineering" ? { ...opt, assignedUsers: 5 } : opt
      );

      AttributeFormActions.render(optionsWithAssignedUsers, mockOnSubmit);
      await AttributeFormActions.deleteOption(user, 0);
      AttributeFormActions.expectDeleteConfirmationDialog();
      const confirmationButton = screen.getByTestId("dialog-confirmation");
      await user.click(confirmationButton);
      await AttributeFormActions.submitForm(user);
      await AttributeFormActions.expectGroupNotContainsOptions(mockOnSubmit, "Tech Teams", ["1"]);
    });
  });
});
