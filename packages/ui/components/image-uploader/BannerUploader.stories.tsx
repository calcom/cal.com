import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import BannerUploader from "./BannerUploader";

const meta = {
  component: BannerUploader,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof BannerUploader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: "banner-upload",
    buttonMsg: "Upload Banner",
    target: "banner",
    height: 200,
    width: 600,
    handleAvatarChange: fn(),
  },
};

export const WithExistingImage: Story = {
  args: {
    id: "banner-upload",
    buttonMsg: "Change Banner",
    target: "banner",
    imageSrc: "https://images.unsplash.com/photo-1557683316-973673baf926?w=600&h=200&fit=crop",
    height: 200,
    width: 600,
    handleAvatarChange: fn(),
  },
};

export const WithInstruction: Story = {
  args: {
    id: "org-banner",
    buttonMsg: "Upload Organization Banner",
    target: "organization banner",
    uploadInstruction: "Recommended size: 1200x400px",
    height: 400,
    width: 1200,
    handleAvatarChange: fn(),
  },
};

export const TeamBanner: Story = {
  args: {
    id: "team-banner",
    buttonMsg: "Upload Team Banner",
    target: "team banner",
    height: 300,
    width: 900,
    handleAvatarChange: fn(),
  },
};

export const Disabled: Story = {
  args: {
    id: "banner-upload",
    buttonMsg: "Upload Banner",
    target: "banner",
    height: 200,
    width: 600,
    disabled: true,
    handleAvatarChange: fn(),
  },
};

export const PrimaryButton: Story = {
  args: {
    id: "banner-upload",
    buttonMsg: "Upload",
    target: "banner",
    height: 200,
    width: 600,
    triggerButtonColor: "primary",
    handleAvatarChange: fn(),
  },
};
