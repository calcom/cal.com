import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { AdminUser, AdminUserContainer } from "./AdminUser";

const meta: Meta<typeof AdminUser> = {
  title: "Components/Setup/AdminUser",
  component: AdminUser,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onSubmit: {
      description: "Callback fired when the form is submitted",
      action: "submitted",
    },
    onError: {
      description: "Callback fired when the form encounters an error",
      action: "error",
    },
    onSuccess: {
      description: "Callback fired when the form submission is successful",
      action: "success",
    },
    nav: {
      description: "Navigation callbacks for wizard navigation",
    },
  },
};

export default meta;
type Story = StoryObj<typeof AdminUser>;

export const Default: Story = {
  args: {
    onSubmit: fn(),
    onError: fn(),
    onSuccess: fn(),
    nav: {
      onNext: fn(),
      onPrev: fn(),
    },
  },
};

export const WithLongWebsiteUrl: Story = {
  args: {
    onSubmit: fn(),
    onError: fn(),
    onSuccess: fn(),
    nav: {
      onNext: fn(),
      onPrev: fn(),
    },
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/setup",
      },
    },
  },
  decorators: [
    (Story) => {
      // Mock a long WEBSITE_URL to trigger the long URL UI
      const originalUrl = process.env.NEXT_PUBLIC_WEBSITE_URL;
      process.env.NEXT_PUBLIC_WEBSITE_URL = "https://very-long-company-name-for-testing.example.com";
      const result = (
        <div className="w-[500px]">
          <Story />
        </div>
      );
      process.env.NEXT_PUBLIC_WEBSITE_URL = originalUrl;
      return result;
    },
  ],
};

export const Interactive: Story = {
  args: {
    onSubmit: fn(),
    onError: fn(),
    onSuccess: fn(),
    nav: {
      onNext: fn(),
      onPrev: fn(),
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Interactive story showing the admin user creation form with validation. Try filling in the form fields to see validation in action. The password field requires uppercase, lowercase, numbers, and at least 7 characters.",
      },
    },
  },
};

// AdminUserContainer stories
const containerMeta: Meta<typeof AdminUserContainer> = {
  title: "Components/Setup/AdminUserContainer",
  component: AdminUserContainer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    userCount: {
      control: "number",
      description: "Number of existing users - shows success state if > 0",
    },
    onSubmit: {
      description: "Callback fired when the form is submitted",
      action: "submitted",
    },
    onError: {
      description: "Callback fired when the form encounters an error",
      action: "error",
    },
    onSuccess: {
      description: "Callback fired when the form submission is successful",
      action: "success",
    },
    nav: {
      description: "Navigation callbacks for wizard navigation",
    },
  },
};

export const ContainerDefault = {
  render: (args: React.ComponentProps<typeof AdminUserContainer>) => <AdminUserContainer {...args} />,
  args: {
    userCount: 0,
    onSubmit: fn(),
    onError: fn(),
    onSuccess: fn(),
    nav: {
      onNext: fn(),
      onPrev: fn(),
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Default state of the container when no admin user exists yet (userCount = 0).",
      },
    },
  },
} satisfies StoryObj<typeof AdminUserContainer>;

export const ContainerWithExistingUser = {
  render: (args: React.ComponentProps<typeof AdminUserContainer>) => <AdminUserContainer {...args} />,
  args: {
    userCount: 1,
    onSubmit: fn(),
    onError: fn(),
    onSuccess: fn(),
    nav: {
      onNext: fn(),
      onPrev: fn(),
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Container state when an admin user already exists (userCount > 0). Shows a success screen instead of the form.",
      },
    },
  },
} satisfies StoryObj<typeof AdminUserContainer>;

export const ContainerMultipleUsers = {
  render: (args: React.ComponentProps<typeof AdminUserContainer>) => <AdminUserContainer {...args} />,
  args: {
    userCount: 5,
    onSubmit: fn(),
    onError: fn(),
    onSuccess: fn(),
    nav: {
      onNext: fn(),
      onPrev: fn(),
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Container with multiple existing users - shows the same success screen as with one user.",
      },
    },
  },
} satisfies StoryObj<typeof AdminUserContainer>;
