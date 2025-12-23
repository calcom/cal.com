import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import SubHeadingTitleWithConnections from "./SubHeadingTitleWithConnections";

const meta = {
  component: SubHeadingTitleWithConnections,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      description: "The title text to display",
      control: "text",
    },
    numConnections: {
      description: "Number of connections to display in the badge",
      control: { type: "number", min: 0 },
    },
  },
} satisfies Meta<typeof SubHeadingTitleWithConnections>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Calendar Integration",
  },
};

export const WithOneConnection: Story = {
  args: {
    title: "Calendar Integration",
    numConnections: 1,
  },
};

export const WithMultipleConnections: Story = {
  args: {
    title: "Calendar Integration",
    numConnections: 3,
  },
};

export const WithZeroConnections: Story = {
  args: {
    title: "Calendar Integration",
    numConnections: 0,
  },
};

export const LongTitle: Story = {
  args: {
    title: "This is a very long integration title to test layout",
    numConnections: 5,
  },
};

export const WithReactNodeTitle: Story = {
  args: {
    title: (
      <span>
        <strong>Bold Title</strong> with some <em>emphasis</em>
      </span>
    ),
    numConnections: 2,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">No Connections</h3>
        <div className="flex gap-2">
          <SubHeadingTitleWithConnections title="No Connection Badge" />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">With Connections</h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <SubHeadingTitleWithConnections title="Google Calendar" numConnections={1} />
          </div>
          <div className="flex gap-2">
            <SubHeadingTitleWithConnections title="Zoom" numConnections={5} />
          </div>
          <div className="flex gap-2">
            <SubHeadingTitleWithConnections title="Microsoft Teams" numConnections={12} />
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
