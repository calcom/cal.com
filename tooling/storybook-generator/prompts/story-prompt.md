# Storybook Story Generation Task

You are generating a Storybook story file for a cal.com React component.

## Instructions

1. First, READ the component file to understand:
   - Its props/interface
   - Default values
   - Variants and states (disabled, loading, etc.)
   - Event handlers

2. Then, CREATE a `.stories.tsx` file in the same directory as the component.

## Required Story Structure

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { ComponentName } from "./ComponentName";

const meta = {
  component: ComponentName,
  parameters: {
    layout: "centered", // Use "padded" for larger components, "fullscreen" for full-width
  },
  tags: ["autodocs"],
  argTypes: {
    // Add controls for important props
    // Example:
    // variant: {
    //   control: "select",
    //   options: ["primary", "secondary"],
    // },
    // disabled: {
    //   control: "boolean",
    // },
  },
  args: {
    // Default args - include fn() for event handlers
    // onClick: fn(),
    // onChange: fn(),
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

// Always include a Default story
export const Default: Story = {
  args: {
    // Basic default props
  },
};

// Add variant stories based on component capabilities
// Examples:
// export const Disabled: Story = { args: { disabled: true } };
// export const Loading: Story = { args: { loading: true } };
// export const WithIcon: Story = { args: { icon: <Icon /> } };
```

## Conventions to Follow

1. **Imports**: Always use `@storybook/nextjs-vite` for Meta/StoryObj types
2. **Event handlers**: Use `fn()` from `storybook/test` for onClick, onChange, etc.
3. **Layout**: Use `"centered"` for form controls/buttons, `"padded"` for larger components
4. **Tags**: Always include `["autodocs"]` for automatic documentation
5. **Naming**: Story names should be PascalCase and descriptive (Default, Disabled, Small, WithIcon)
6. **Args-based**: Prefer `args: {}` over `render:` when possible for better Storybook controls

## Story Variants to Include

Based on the component, include relevant stories:
- **Default** - Always required
- **Disabled** - If component has disabled state
- **Loading** - If component has loading state
- **Sizes** - If component has size variants (sm, md, lg)
- **Variants** - If component has style variants
- **WithIcon** - If component supports icons
- **Error/Invalid** - If it's a form component with error state

## Example Output

For a Button component, the story might look like:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { Button } from "./Button";

const meta = {
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "destructive"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    disabled: {
      control: "boolean",
    },
  },
  args: {
    onClick: fn(),
    children: "Button",
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Small: Story = {
  args: {
    size: "sm",
  },
};
```

## Important Notes

- Do NOT include explanatory comments in the output
- Do NOT wrap the output in markdown code blocks
- ONLY output the TypeScript story file content
- Make sure imports are correct relative paths
- If the component requires complex props (like data arrays), create minimal mock data
