import type { Meta, StoryObj } from "@storybook/react";
import type { ComponentProps } from "react";

import { Dialog, DialogContent, DialogFooter, DialogClose, DialogHeader } from "./Dialog";

type StoryArgs = ComponentProps<typeof Dialog> &
  ComponentProps<typeof DialogContent> &
  ComponentProps<typeof DialogHeader> &
  ComponentProps<typeof DialogFooter> &
  ComponentProps<typeof DialogClose> & {
    onClick: (...args: unknown[]) => void;
  };

const meta: Meta<StoryArgs> = {
  component: Dialog,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
  title: "UI/Dialog",
  argTypes: {
    title: {
      control: "text",
    },
    description: {
      control: "text",
    },
    type: {
      options: ["creation", "confirmation"],
      control: {
        type: "select",
      },
    },
    open: {
      control: "boolean",
    },
    showDivider: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
    color: {
      options: ["minimal", "primary", "secondary", "emphasis"],
      control: {
        type: "select",
      },
    },
    onClick: { action: "clicked" }, // this is a storybook action addons action
  },
  render: ({ title, description, type, open, showDivider, disabled, color, onClick }) => (
    <Dialog open={open}>
      <DialogContent type={type}>
        <DialogHeader title={title} subtitle={description} />
        <DialogFooter showDivider={showDivider}>
          <DialogClose
            disabled={disabled}
            color={color}
            onClick={() => {
              const currentUrl = new URL(window.location.href);
              currentUrl.searchParams.set("args", "open:false");
              window.open(currentUrl.toString(), "_self");
              onClick();
            }}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  name: "Dialog",
  args: {
    title: "Example Dialog",
    description: "Example Dialog Description",
    type: "creation",
    open: true,
    showDivider: false,
    disabled: false,
    color: "minimal",
  },
};
