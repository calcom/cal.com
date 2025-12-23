import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "./Button";

const meta = {
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    color: {
      control: "select",
      options: ["primary", "secondary", "minimal", "destructive"],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "base", "lg"],
    },
    variant: {
      control: "select",
      options: ["button", "icon", "fab"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: "Primary Button",
    color: "primary",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary Button",
    color: "secondary",
  },
};

export const Minimal: Story = {
  args: {
    children: "Minimal Button",
    color: "minimal",
  },
};

export const Destructive: Story = {
  args: {
    children: "Delete",
    color: "destructive",
  },
};

export const WithStartIcon: Story = {
  args: {
    children: "Add Event",
    color: "primary",
    StartIcon: "plus",
  },
};

export const WithEndIcon: Story = {
  args: {
    children: "Next",
    color: "secondary",
    EndIcon: "arrow-right",
  },
};

export const WithBothIcons: Story = {
  args: {
    children: "Edit",
    color: "secondary",
    StartIcon: "pencil",
    EndIcon: "arrow-right",
  },
};

export const IconVariant: Story = {
  args: {
    variant: "icon",
    color: "secondary",
    StartIcon: "settings",
    tooltip: "Settings",
  },
};

export const IconSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button variant="icon" size="xs" color="secondary" StartIcon="settings" tooltip="Extra Small" />
      <Button variant="icon" size="sm" color="secondary" StartIcon="settings" tooltip="Small" />
      <Button variant="icon" size="base" color="secondary" StartIcon="settings" tooltip="Base" />
      <Button variant="icon" size="lg" color="secondary" StartIcon="settings" tooltip="Large" />
    </div>
  ),
};

export const FabVariant: Story = {
  args: {
    variant: "fab",
    color: "primary",
    children: "New Event",
    StartIcon: "plus",
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button size="xs">Extra Small</Button>
        <Button size="sm">Small</Button>
        <Button size="base">Base</Button>
        <Button size="lg">Large</Button>
      </div>
    </div>
  ),
};

export const Loading: Story = {
  args: {
    children: "Loading...",
    loading: true,
  },
};

export const LoadingColors: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button color="primary" loading>
        Primary
      </Button>
      <Button color="secondary" loading>
        Secondary
      </Button>
      <Button color="minimal" loading>
        Minimal
      </Button>
      <Button color="destructive" loading>
        Destructive
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    children: "Disabled",
    disabled: true,
  },
};

export const DisabledColors: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button color="primary" disabled>
        Primary
      </Button>
      <Button color="secondary" disabled>
        Secondary
      </Button>
      <Button color="minimal" disabled>
        Minimal
      </Button>
      <Button color="destructive" disabled>
        Destructive
      </Button>
    </div>
  ),
};

export const WithTooltip: Story = {
  args: {
    children: "Hover me",
    tooltip: "This is a helpful tooltip",
  },
};

export const TooltipPositions: Story = {
  render: () => (
    <div className="flex items-center gap-4 p-12">
      <Button tooltip="Top tooltip" tooltipSide="top">
        Top
      </Button>
      <Button tooltip="Right tooltip" tooltipSide="right">
        Right
      </Button>
      <Button tooltip="Bottom tooltip" tooltipSide="bottom">
        Bottom
      </Button>
      <Button tooltip="Left tooltip" tooltipSide="left">
        Left
      </Button>
    </div>
  ),
};

export const AsLink: Story = {
  args: {
    children: "Go to Dashboard",
    href: "#dashboard",
    StartIcon: "layout-dashboard",
  },
};

export const AllColors: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button color="primary">Primary</Button>
        <Button color="secondary">Secondary</Button>
        <Button color="minimal">Minimal</Button>
        <Button color="destructive">Destructive</Button>
      </div>
      <div className="flex items-center gap-4">
        <Button color="primary" StartIcon="plus">
          With Icon
        </Button>
        <Button color="secondary" StartIcon="pencil">
          Edit
        </Button>
        <Button color="minimal" StartIcon="download">
          Download
        </Button>
        <Button color="destructive" StartIcon="trash-2">
          Delete
        </Button>
      </div>
    </div>
  ),
};
