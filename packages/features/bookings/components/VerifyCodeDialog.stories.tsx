import type { Meta, StoryObj } from "@storybook/react";
import type { ComponentProps } from "react";

import { StorybookTrpcProvider } from "@calcom/ui";

import { VerifyCodeDialog } from "./VerifyCodeDialog";

type StoryArgs = ComponentProps<typeof VerifyCodeDialog>;

const meta: Meta<StoryArgs> = {
  component: VerifyCodeDialog,
  title: "Features/VerifyCodeDialog",
  argTypes: {
    isOpenDialog: { control: "boolean", description: "Indicates whether the dialog is open or not." },
    setIsOpenDialog: { action: "setIsOpenDialog", description: "Function to set the dialog state." },
    email: { control: "text", description: "Email to which the verification code was sent." },
    onSuccess: { action: "onSuccess", description: "Callback function when verification succeeds." },
    // onError: { action: "onError", description: "Callback function when verification fails." },
    isUserSessionRequiredToVerify: {
      control: "boolean",
      description: "Indicates if user session is required for verification.",
    },
  },
  decorators: [
    (Story) => (
      <StorybookTrpcProvider>
        <Story />
      </StorybookTrpcProvider>
    ),
  ],
  render: (args) => <VerifyCodeDialog {...args} />,
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  name: "Dialog",
  args: {
    isOpenDialog: true,
    email: "example@email.com",
    // onError: (err) => {
    //   if (err.message === "invalid_code") {
    //     alert("Code provided is invalid");
    //   }
    // },
  },
};
