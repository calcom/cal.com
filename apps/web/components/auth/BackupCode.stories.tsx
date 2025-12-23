import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FormProvider, useForm } from "react-hook-form";

import BackupCode from "./BackupCode";

const meta: Meta<typeof BackupCode> = {
  title: "Components/Auth/BackupCode",
  component: BackupCode,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => {
      const methods = useForm({
        defaultValues: {
          backupCode: "",
        },
      });
      return (
        <FormProvider {...methods}>
          <Story />
        </FormProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof BackupCode>;

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
