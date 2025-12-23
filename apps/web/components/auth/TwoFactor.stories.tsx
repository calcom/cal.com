import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FormProvider, useForm } from "react-hook-form";

import TwoFactor from "./TwoFactor";

const meta: Meta<typeof TwoFactor> = {
  title: "Components/Auth/TwoFactor",
  component: TwoFactor,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => {
      const methods = useForm({
        defaultValues: {
          totpCode: "",
        },
      });
      return (
        <FormProvider {...methods}>
          <Story />
        </FormProvider>
      );
    },
  ],
  argTypes: {
    center: {
      control: "boolean",
      description: "Whether to center the component horizontally",
    },
    autoFocus: {
      control: "boolean",
      description: "Whether to auto-focus the first input on mount",
    },
  },
};

export default meta;
type Story = StoryObj<typeof TwoFactor>;

export const Default: Story = {};

export const Centered: Story = {
  args: {
    center: true,
  },
};

export const NotCentered: Story = {
  args: {
    center: false,
  },
};

export const WithAutoFocus: Story = {
  args: {
    autoFocus: true,
  },
};

export const WithoutAutoFocus: Story = {
  args: {
    autoFocus: false,
  },
};
