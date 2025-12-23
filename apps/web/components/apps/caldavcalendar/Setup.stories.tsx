import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import Setup from "./Setup";

const meta = {
  title: "Apps/CalDAV Calendar/Setup",
  component: Setup,
  parameters: {
    layout: "centered",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/caldavcalendar/setup",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Setup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state of the CalDAV Calendar setup form.
 * Shows empty input fields ready for user configuration.
 */
export const Default: Story = {};

/**
 * Form with partially filled data.
 * Demonstrates the form in the middle of user input.
 */
export const PartiallyFilled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Fill in URL field
    const urlInput = canvas.getByLabelText(/calendar_url/i);
    await userEvent.type(urlInput, "https://caldav.example.com/calendar");

    // Fill in username field
    const usernameInput = canvas.getByLabelText(/username/i);
    await userEvent.type(usernameInput, "john.doe");
  },
};

/**
 * Form with all fields filled.
 * Shows the complete state before submission.
 */
export const FilledForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Fill in all fields
    const urlInput = canvas.getByLabelText(/calendar_url/i);
    await userEvent.type(urlInput, "https://caldav.example.com/calendar");

    const usernameInput = canvas.getByLabelText(/username/i);
    await userEvent.type(usernameInput, "john.doe");

    const passwordInput = canvas.getByLabelText(/password/i);
    await userEvent.type(passwordInput, "secretpassword123");
  },
};

/**
 * Form in submitting state.
 * Shows the loading state when the form is being submitted.
 */
export const Submitting: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Fill in all fields
    const urlInput = canvas.getByLabelText(/calendar_url/i);
    await userEvent.type(urlInput, "https://caldav.example.com/calendar");

    const usernameInput = canvas.getByLabelText(/username/i);
    await userEvent.type(usernameInput, "john.doe");

    const passwordInput = canvas.getByLabelText(/password/i);
    await userEvent.type(passwordInput, "secretpassword123");

    // Click submit button
    const submitButton = canvas.getByRole("button", { name: /save/i });
    await userEvent.click(submitButton);
  },
  parameters: {
    msw: {
      handlers: [
        // Mock API call to simulate slow response
        {
          url: "/api/integrations/caldavcalendar/add",
          method: "POST",
          status: 200,
          delay: 3000,
          response: {
            url: "/apps/installed/calendar",
          },
        },
      ],
    },
  },
};

/**
 * Form with validation error.
 * Demonstrates required field validation by attempting to submit empty form.
 */
export const ValidationError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Try to submit without filling fields
    const submitButton = canvas.getByRole("button", { name: /save/i });
    await userEvent.click(submitButton);

    // Browser's HTML5 validation should prevent submission
  },
};

/**
 * Form with server error response.
 * Shows the error alert when the API returns an error.
 */
export const WithError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Fill in all fields
    const urlInput = canvas.getByLabelText(/calendar_url/i);
    await userEvent.type(urlInput, "https://invalid-caldav.example.com/calendar");

    const usernameInput = canvas.getByLabelText(/username/i);
    await userEvent.type(usernameInput, "wronguser");

    const passwordInput = canvas.getByLabelText(/password/i);
    await userEvent.type(passwordInput, "wrongpassword");

    // Click submit button
    const submitButton = canvas.getByRole("button", { name: /save/i });
    await userEvent.click(submitButton);

    // Wait for error message to appear
    await canvas.findByText(/authentication failed/i);
  },
  parameters: {
    msw: {
      handlers: [
        {
          url: "/api/integrations/caldavcalendar/add",
          method: "POST",
          status: 401,
          response: {
            message: "Authentication failed. Please check your credentials.",
          },
        },
      ],
    },
  },
};

/**
 * Form with error and action button.
 * Shows error alert with an additional action button to go to admin panel.
 */
export const WithErrorAndAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Fill in all fields
    const urlInput = canvas.getByLabelText(/calendar_url/i);
    await userEvent.type(urlInput, "https://caldav.example.com/calendar");

    const usernameInput = canvas.getByLabelText(/username/i);
    await userEvent.type(usernameInput, "user");

    const passwordInput = canvas.getByLabelText(/password/i);
    await userEvent.type(passwordInput, "password");

    // Click submit button
    const submitButton = canvas.getByRole("button", { name: /save/i });
    await userEvent.click(submitButton);

    // Wait for error message and action button
    await canvas.findByText(/calendar not found/i);
    await canvas.findByRole("button", { name: /go to admin/i });
  },
  parameters: {
    msw: {
      handlers: [
        {
          url: "/api/integrations/caldavcalendar/add",
          method: "POST",
          status: 404,
          response: {
            message: "Calendar not found. Please check your configuration in admin panel.",
            actionUrl: "/settings/admin/apps/calendar",
          },
        },
      ],
    },
  },
};
