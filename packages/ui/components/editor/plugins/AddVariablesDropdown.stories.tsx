import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { AddVariablesDropdown } from "./AddVariablesDropdown";

const meta = {
  component: AddVariablesDropdown,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    addVariable: fn(),
  },
} satisfies Meta<typeof AddVariablesDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variables: ["attendee name", "event name", "event date", "event time", "organizer name"],
    isTextEditor: false,
  },
};

export const TextEditorMode: Story = {
  args: {
    variables: ["attendee name", "event name", "event date", "event time", "organizer name"],
    isTextEditor: true,
  },
};

export const TextEditorWithButtonTop: Story = {
  args: {
    variables: ["attendee name", "event name", "event date", "event time", "organizer name"],
    isTextEditor: true,
    addVariableButtonTop: true,
  },
};

export const WithManyVariables: Story = {
  args: {
    variables: [
      "attendee name",
      "attendee email",
      "attendee first name",
      "attendee last name",
      "event name",
      "event date",
      "event time",
      "event duration",
      "event location",
      "event description",
      "organizer name",
      "organizer email",
      "booking date",
      "booking time",
      "reschedule link",
      "cancel link",
    ],
    isTextEditor: false,
  },
};

export const WithFewVariables: Story = {
  args: {
    variables: ["attendee name", "event name"],
    isTextEditor: false,
  },
};

export const EmptyVariables: Story = {
  args: {
    variables: [],
    isTextEditor: false,
  },
};

export const WithCustomClassName: Story = {
  args: {
    variables: ["attendee name", "event name", "event date", "event time", "organizer name"],
    isTextEditor: false,
    addVariableButtonClassName: "custom-button-class",
  },
};

export const TextEditorManyVariables: Story = {
  args: {
    variables: [
      "attendee name",
      "attendee email",
      "attendee first name",
      "attendee last name",
      "attendee timezone",
      "attendee phone",
      "event name",
      "event date",
      "event time",
      "event duration",
      "event location",
      "event description",
      "event link",
      "organizer name",
      "organizer email",
      "organizer phone",
      "booking date",
      "booking time",
      "booking reference",
      "reschedule link",
      "cancel link",
      "payment amount",
      "payment status",
    ],
    isTextEditor: true,
  },
};
