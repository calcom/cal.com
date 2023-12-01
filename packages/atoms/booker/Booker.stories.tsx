import type { Meta, StoryObj } from "@storybook/react";

import { StorybookTrpcProvider } from "@calcom/ui";

import { Booker } from "./Booker";

const meta: Meta<typeof Booker> = {
  component: Booker,
  title: "Atoms/Booker",
  decorators: [
    (Story) => (
      <StorybookTrpcProvider>
        <Story />
      </StorybookTrpcProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Booker>;

export const Default: Story = {
  name: "Booker",
  render: () => <Booker username="pro" eventSlug="" entity={{}} />,
};
