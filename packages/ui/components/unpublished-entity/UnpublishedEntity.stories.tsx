import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { UnpublishedEntity } from "./UnpublishedEntity";

const meta = {
  component: UnpublishedEntity,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof UnpublishedEntity>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Team: Story = {
  args: {
    teamSlug: "acme-team",
    name: "Acme Team",
  },
};

export const Organization: Story = {
  args: {
    orgSlug: "acme-org",
    name: "Acme Organization",
  },
};

export const WithLogo: Story = {
  args: {
    teamSlug: "design-team",
    name: "Design Team",
    logoUrl: "https://i.pravatar.cc/150?img=10",
  },
};

export const LongName: Story = {
  args: {
    teamSlug: "engineering",
    name: "The Very Long Engineering and Development Team Name",
  },
};

export const WithApostrophe: Story = {
  args: {
    teamSlug: "johns-team",
    name: "John's Team",
  },
};
