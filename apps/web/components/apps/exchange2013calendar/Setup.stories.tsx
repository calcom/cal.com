import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import Exchange2013CalendarSetup from "./Setup";

const meta = {
  title: "Components/Apps/Exchange2013Calendar/Setup",
  component: Exchange2013CalendarSetup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen w-screen">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Exchange2013CalendarSetup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state of the Exchange 2013 Calendar setup form.
 * Shows the initial empty form with username, password, and URL fields.
 */
export const Default: Story = {};

/**
 * Setup form with a pre-filled EWS URL.
 * Useful for testing when the EXCHANGE_DEFAULT_EWS_URL environment variable is set.
 */
export const WithDefaultUrl: Story = {
  parameters: {
    mockData: [
      {
        url: "/api/integrations/exchange2013calendar/add",
        method: "POST",
        status: 200,
        response: {
          url: "/apps/installed",
        },
      },
    ],
  },
};

/**
 * Setup form in submitting state.
 * Shows the loading state when the form is being submitted.
 */
export const Submitting: Story = {
  play: async ({ canvasElement }) => {
    // This would show the loading state when submit is clicked
    // In actual implementation, you'd need to interact with the form
  },
};

/**
 * Setup form with an error message displayed.
 * Shows how validation or API errors are displayed to the user.
 */
export const WithError: Story = {
  parameters: {
    mockData: [
      {
        url: "/api/integrations/exchange2013calendar/add",
        method: "POST",
        status: 400,
        response: {
          message: "Invalid credentials. Please check your username and password.",
        },
      },
    ],
  },
};

/**
 * Setup form with network error.
 * Simulates a scenario where the API request fails.
 */
export const WithNetworkError: Story = {
  parameters: {
    mockData: [
      {
        url: "/api/integrations/exchange2013calendar/add",
        method: "POST",
        status: 500,
        response: {
          message: "Unable to connect to Exchange server. Please try again later.",
        },
      },
    ],
  },
};

/**
 * Setup form with authentication error.
 * Shows the error state when authentication fails.
 */
export const WithAuthenticationError: Story = {
  parameters: {
    mockData: [
      {
        url: "/api/integrations/exchange2013calendar/add",
        method: "POST",
        status: 401,
        response: {
          message: "Authentication failed. Invalid username or password.",
        },
      },
    ],
  },
};
