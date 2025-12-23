import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { Input } from "../form/inputs/TextField";
import FormCard, { FormCardBody } from "./FormCard";

const meta = {
  component: FormCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FormCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Form Field",
    children: (
      <FormCardBody>
        <Input placeholder="Enter value..." />
      </FormCardBody>
    ),
  },
};

export const WithLeftIcon: Story = {
  args: {
    label: "Email Field",
    leftIcon: "mail",
    children: (
      <FormCardBody>
        <Input type="email" placeholder="Enter email..." />
      </FormCardBody>
    ),
  },
};

export const WithBadge: Story = {
  args: {
    label: "Premium Feature",
    badge: { text: "Pro", variant: "blue" },
    children: (
      <FormCardBody>
        <p className="text-subtle text-sm">This feature is only available on Pro plans</p>
      </FormCardBody>
    ),
  },
};

export const WithActions: Story = {
  args: {
    label: "Custom Question",
    deleteField: { check: () => true, fn: fn() },
    duplicateField: { check: () => true, fn: fn() },
    children: (
      <FormCardBody>
        <Input placeholder="Enter your question..." />
      </FormCardBody>
    ),
  },
};

export const WithMoveActions: Story = {
  args: {
    label: "Reorderable Field",
    moveUp: { check: () => true, fn: fn() },
    moveDown: { check: () => true, fn: fn() },
    deleteField: { check: () => true, fn: fn() },
    children: (
      <FormCardBody>
        <Input placeholder="This field can be moved" />
      </FormCardBody>
    ),
  },
};

export const NonCollapsible: Story = {
  args: {
    label: "Always Visible",
    collapsible: false,
    children: (
      <FormCardBody>
        <p className="text-subtle text-sm">This card cannot be collapsed</p>
      </FormCardBody>
    ),
  },
};

export const EditableLabel: Story = {
  args: {
    label: "Click to edit",
    isLabelEditable: true,
    onLabelChange: fn(),
    children: (
      <FormCardBody>
        <p className="text-subtle text-sm">The label above is editable</p>
      </FormCardBody>
    ),
  },
};

export const MultipleFormCards: Story = {
  render: () => (
    <div className="space-y-2">
      <FormCard
        label="Name"
        leftIcon="user"
        deleteField={{ check: () => true, fn: fn() }}
        duplicateField={{ check: () => true, fn: fn() }}
        moveUp={{ check: () => false, fn: fn() }}
        moveDown={{ check: () => true, fn: fn() }}>
        <FormCardBody>
          <Input placeholder="Enter your name" />
        </FormCardBody>
      </FormCard>
      <FormCard
        label="Email"
        leftIcon="mail"
        deleteField={{ check: () => true, fn: fn() }}
        duplicateField={{ check: () => true, fn: fn() }}
        moveUp={{ check: () => true, fn: fn() }}
        moveDown={{ check: () => true, fn: fn() }}>
        <FormCardBody>
          <Input type="email" placeholder="Enter your email" />
        </FormCardBody>
      </FormCard>
      <FormCard
        label="Notes"
        leftIcon="file-text"
        deleteField={{ check: () => true, fn: fn() }}
        duplicateField={{ check: () => true, fn: fn() }}
        moveUp={{ check: () => true, fn: fn() }}
        moveDown={{ check: () => false, fn: fn() }}>
        <FormCardBody>
          <textarea
            className="border-subtle w-full rounded-md border p-2 text-sm"
            placeholder="Additional notes..."
            rows={3}
          />
        </FormCardBody>
      </FormCard>
    </div>
  ),
};
