import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { useState } from "react";

import { Button } from "@calcom/ui/components/button";

import { ConfirmDialog } from "./ConfirmDialog";

const meta = {
  title: "Components/Apps/WipeMyCalOther/ConfirmDialog",
  component: ConfirmDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    isOpenDialog: {
      control: "boolean",
      description: "Controls whether the dialog is open or closed",
    },
    setIsOpenDialog: {
      description: "Function to set the dialog open state",
    },
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper component to manage dialog state
const DialogWrapper = ({ initialOpen = false }: { initialOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Wipe My Calendar</Button>
      <ConfirmDialog isOpenDialog={isOpen} setIsOpenDialog={setIsOpen} />
    </div>
  );
};

export const Default: Story = {
  render: () => <DialogWrapper initialOpen={true} />,
};

export const ClosedState: Story = {
  render: () => <DialogWrapper initialOpen={false} />,
};

export const WithTriggerButton: Story = {
  render: () => <DialogWrapper />,
  parameters: {
    docs: {
      description: {
        story: "Click the button to open the dialog",
      },
    },
  },
};
