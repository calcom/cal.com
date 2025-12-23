import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import Exchange2016CalendarSetup from "./Setup";

const meta = {
  title: "Components/Apps/Exchange2016Calendar/Setup",
  component: Exchange2016CalendarSetup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-screen h-screen">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Exchange2016CalendarSetup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDefaultURL: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
  play: async ({ canvasElement }) => {
    // This story demonstrates the component with a default EWS URL pre-filled
    // In actual usage, this would be populated from process.env.EXCHANGE_DEFAULT_EWS_URL
  },
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

export const TabletView: Story = {
  parameters: {
    viewport: {
      defaultViewport: "tablet",
    },
  },
};
