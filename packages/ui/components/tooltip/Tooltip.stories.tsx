import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../button";
import { Icon } from "../icon";
import { Tooltip } from "./Tooltip";

const meta = {
  component: Tooltip,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    content: {
      description: "The content to display in the tooltip",
      control: "text",
    },
    side: {
      description: "The preferred side of the trigger to render the tooltip",
      control: { type: "select" },
      options: ["top", "right", "bottom", "left"],
    },
    delayDuration: {
      description: "Delay in ms before the tooltip appears",
      control: { type: "number" },
    },
  },
  decorators: [
    (Story) => (
      <div className="p-16">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: "This is a tooltip",
    children: <Button>Hover me</Button>,
  },
};

export const Sides: Story = {
  render: () => (
    <div className="flex gap-8">
      <Tooltip content="Top tooltip" side="top">
        <Button color="secondary">Top</Button>
      </Tooltip>
      <Tooltip content="Right tooltip" side="right">
        <Button color="secondary">Right</Button>
      </Tooltip>
      <Tooltip content="Bottom tooltip" side="bottom">
        <Button color="secondary">Bottom</Button>
      </Tooltip>
      <Tooltip content="Left tooltip" side="left">
        <Button color="secondary">Left</Button>
      </Tooltip>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Tooltip content="Get more information">
      <button className="text-subtle hover:text-default">
        <Icon name="info" className="h-4 w-4" />
      </button>
    </Tooltip>
  ),
};

export const LongContent: Story = {
  args: {
    content: "This is a longer tooltip that contains more detailed information about the element you're hovering over.",
    children: <Button color="minimal">Hover for details</Button>,
  },
};

export const WithDelay: Story = {
  args: {
    content: "This tooltip has a delay",
    delayDuration: 500,
    children: <Button color="secondary">Hover (500ms delay)</Button>,
  },
};

export const OnIconButton: Story = {
  render: () => (
    <div className="flex gap-4">
      <Tooltip content="Edit">
        <Button color="minimal" StartIcon="pencil" />
      </Tooltip>
      <Tooltip content="Delete">
        <Button color="minimal" StartIcon="trash" />
      </Tooltip>
      <Tooltip content="Settings">
        <Button color="minimal" StartIcon="settings" />
      </Tooltip>
      <Tooltip content="Copy link">
        <Button color="minimal" StartIcon="link" />
      </Tooltip>
    </div>
  ),
};
