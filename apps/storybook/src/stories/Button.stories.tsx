import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@calcom/ui/components/button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'minimal', 'destructive'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'base', 'lg'],
    },
    loading: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    color: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    color: 'secondary',
  },
};

export const Minimal: Story = {
  args: {
    children: 'Minimal Button',
    color: 'minimal',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Destructive Button',
    color: 'destructive',
  },
};

export const Loading: Story = {
  args: {
    children: 'Loading...',
    color: 'primary',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    color: 'primary',
    disabled: true,
  },
};

export const WithStartIcon: Story = {
  args: {
    children: 'Add Event',
    color: 'primary',
    StartIcon: 'plus',
  },
};

export const WithEndIcon: Story = {
  args: {
    children: 'Next',
    color: 'primary',
    EndIcon: 'arrow-right',
  },
};
