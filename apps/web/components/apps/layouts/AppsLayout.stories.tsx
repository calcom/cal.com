import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRouter } from "next/navigation";

import AppsLayout from "./AppsLayout";

const meta: Meta<typeof AppsLayout> = {
  title: "Apps/Layouts/AppsLayout",
  component: AppsLayout,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps",
      },
    },
  },
  argTypes: {
    children: {
      control: false,
      description: "The content to display inside the layout",
    },
    isAdmin: {
      control: "boolean",
      description: "Whether the current user is an admin",
    },
    actions: {
      control: false,
      description: "Optional action buttons to display in the shell",
    },
    emptyStore: {
      control: "boolean",
      description: "Whether to show the empty state screen",
    },
  },
};

export default meta;
type Story = StoryObj<typeof AppsLayout>;

export const Default: Story = {
  args: {
    isAdmin: false,
    emptyStore: false,
    children: (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">Apps Content</h1>
        <p className="text-gray-600">This is the main content area for apps.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Calendar App</h3>
            <p className="text-sm text-gray-500">Manage your calendar integrations</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Video App</h3>
            <p className="text-sm text-gray-500">Configure video conferencing</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Payment App</h3>
            <p className="text-sm text-gray-500">Set up payment integrations</p>
          </div>
        </div>
      </div>
    ),
  },
};

export const WithActions: Story = {
  args: {
    isAdmin: false,
    emptyStore: false,
    actions: (className?: string) => (
      <button className={className}>
        <span className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Add New App
        </span>
      </button>
    ),
    children: (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-bold">Apps with Actions</h1>
        <p className="text-gray-600">Layout with action buttons in the header.</p>
      </div>
    ),
  },
};

export const EmptyStateAdmin: Story = {
  args: {
    isAdmin: true,
    emptyStore: true,
    children: null,
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state shown to admin users when no apps are configured.",
      },
    },
  },
};

export const EmptyStateNonAdmin: Story = {
  args: {
    isAdmin: false,
    emptyStore: true,
    children: null,
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state shown to non-admin users when no apps are configured.",
      },
    },
  },
};

export const WithCustomShellProps: Story = {
  args: {
    isAdmin: true,
    emptyStore: false,
    heading: "Custom Apps Heading",
    subtitle: "Manage your application integrations",
    children: (
      <div className="space-y-4 p-6">
        <h2 className="text-xl font-semibold">Custom Shell Configuration</h2>
        <p className="text-gray-600">
          This story demonstrates using Shell component props like heading and subtitle.
        </p>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "AppsLayout with custom Shell component properties.",
      },
    },
  },
};

export const WithComplexContent: Story = {
  args: {
    isAdmin: true,
    emptyStore: false,
    actions: (className?: string) => (
      <div className={className}>
        <button className="mr-2 rounded-md border px-4 py-2 hover:bg-gray-50">
          Filter
        </button>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Install App
        </button>
      </div>
    ),
    children: (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">All Apps</h1>
          <input
            type="text"
            placeholder="Search apps..."
            className="rounded-md border px-4 py-2"
          />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              name: "Google Calendar",
              category: "Calendar",
              status: "Installed",
              color: "blue",
            },
            {
              name: "Zoom",
              category: "Video",
              status: "Available",
              color: "gray",
            },
            {
              name: "Stripe",
              category: "Payment",
              status: "Installed",
              color: "blue",
            },
            {
              name: "Microsoft Teams",
              category: "Video",
              status: "Available",
              color: "gray",
            },
            {
              name: "PayPal",
              category: "Payment",
              status: "Available",
              color: "gray",
            },
            {
              name: "Outlook Calendar",
              category: "Calendar",
              status: "Installed",
              color: "blue",
            },
          ].map((app, index) => (
            <div key={index} className="rounded-lg border p-6 shadow-sm hover:shadow-md">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">{app.name}</h3>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    app.status === "Installed"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}>
                  {app.status}
                </span>
              </div>
              <p className="mb-4 text-sm text-gray-500">{app.category}</p>
              <button
                className={`w-full rounded-md px-4 py-2 text-sm ${
                  app.status === "Installed"
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}>
                {app.status === "Installed" ? "Configure" : "Install"}
              </button>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "AppsLayout with a complex content layout showing multiple apps.",
      },
    },
  },
};
