import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import ImageUploader from "./ImageUploader";

const meta = {
  component: ImageUploader,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ImageUploader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: "avatar-upload",
    buttonMsg: "Upload Avatar",
    target: "avatar",
    handleAvatarChange: fn(),
  },
};

export const WithExistingImage: Story = {
  args: {
    id: "avatar-upload",
    buttonMsg: "Change Avatar",
    target: "avatar",
    imageSrc: "https://i.pravatar.cc/150?img=1",
    handleAvatarChange: fn(),
  },
};

export const WithInstruction: Story = {
  args: {
    id: "logo-upload",
    buttonMsg: "Upload Logo",
    target: "logo",
    uploadInstruction: "Recommended size: 256x256px",
    handleAvatarChange: fn(),
  },
};

export const PrimaryButton: Story = {
  args: {
    id: "avatar-upload",
    buttonMsg: "Upload",
    target: "avatar",
    triggerButtonColor: "primary",
    handleAvatarChange: fn(),
  },
};

export const SmallButton: Story = {
  args: {
    id: "avatar-upload",
    buttonMsg: "Upload",
    target: "avatar",
    buttonSize: "sm",
    handleAvatarChange: fn(),
  },
};

export const Disabled: Story = {
  args: {
    id: "avatar-upload",
    buttonMsg: "Upload Avatar",
    target: "avatar",
    disabled: true,
    handleAvatarChange: fn(),
  },
};

export const TeamLogo: Story = {
  args: {
    id: "team-logo",
    buttonMsg: "Upload Team Logo",
    target: "team logo",
    uploadInstruction: "PNG, JPG up to 5MB",
    handleAvatarChange: fn(),
  },
};

export const ProfilePicture: Story = {
  args: {
    id: "profile-picture",
    buttonMsg: "Change Picture",
    target: "profile picture",
    imageSrc: "https://i.pravatar.cc/150?img=5",
    triggerButtonColor: "secondary",
    handleAvatarChange: fn(),
  },
};
