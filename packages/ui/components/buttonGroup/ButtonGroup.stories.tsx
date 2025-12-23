import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../button";
import { ButtonGroup } from "./ButtonGroup";

const meta = {
  component: ButtonGroup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ButtonGroup>
      <Button color="secondary">Edit</Button>
      <Button color="secondary">Duplicate</Button>
      <Button color="secondary">Delete</Button>
    </ButtonGroup>
  ),
};

export const Combined: Story = {
  render: () => (
    <ButtonGroup combined>
      <Button color="secondary">Edit</Button>
      <Button color="secondary">Duplicate</Button>
      <Button color="secondary">Delete</Button>
    </ButtonGroup>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <ButtonGroup>
      <Button color="secondary" StartIcon="pencil">Edit</Button>
      <Button color="secondary" StartIcon="copy">Duplicate</Button>
      <Button color="secondary" StartIcon="trash">Delete</Button>
    </ButtonGroup>
  ),
};

export const CombinedWithIcons: Story = {
  render: () => (
    <ButtonGroup combined>
      <Button color="secondary" StartIcon="pencil">Edit</Button>
      <Button color="secondary" StartIcon="copy">Duplicate</Button>
      <Button color="secondary" StartIcon="trash">Delete</Button>
    </ButtonGroup>
  ),
};

export const IconOnly: Story = {
  render: () => (
    <ButtonGroup combined>
      <Button color="secondary" variant="icon" StartIcon="align-left" />
      <Button color="secondary" variant="icon" StartIcon="align-center" />
      <Button color="secondary" variant="icon" StartIcon="align-right" />
    </ButtonGroup>
  ),
};

export const ViewToggle: Story = {
  render: () => (
    <ButtonGroup combined>
      <Button color="secondary" variant="icon" StartIcon="layout-grid" />
      <Button color="secondary" variant="icon" StartIcon="list" />
    </ButtonGroup>
  ),
};

export const PaginationControls: Story = {
  render: () => (
    <ButtonGroup combined>
      <Button color="secondary" variant="icon" StartIcon="chevron-left" />
      <Button color="secondary" variant="icon" StartIcon="chevron-right" />
    </ButtonGroup>
  ),
};

export const MixedColors: Story = {
  render: () => (
    <ButtonGroup>
      <Button color="secondary">Cancel</Button>
      <Button color="primary">Save</Button>
    </ButtonGroup>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-subtle mb-2">Small</p>
        <ButtonGroup combined>
          <Button color="secondary" size="sm">Edit</Button>
          <Button color="secondary" size="sm">Delete</Button>
        </ButtonGroup>
      </div>
      <div>
        <p className="text-xs text-subtle mb-2">Base (default)</p>
        <ButtonGroup combined>
          <Button color="secondary">Edit</Button>
          <Button color="secondary">Delete</Button>
        </ButtonGroup>
      </div>
      <div>
        <p className="text-xs text-subtle mb-2">Large</p>
        <ButtonGroup combined>
          <Button color="secondary" size="lg">Edit</Button>
          <Button color="secondary" size="lg">Delete</Button>
        </ButtonGroup>
      </div>
    </div>
  ),
};

export const ActionBar: Story = {
  render: () => (
    <div className="border-subtle flex items-center justify-between rounded-lg border p-4">
      <span className="text-sm">3 items selected</span>
      <ButtonGroup>
        <Button color="secondary" size="sm">Archive</Button>
        <Button color="secondary" size="sm">Move</Button>
        <Button color="destructive" size="sm">Delete</Button>
      </ButtonGroup>
    </div>
  ),
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
};
