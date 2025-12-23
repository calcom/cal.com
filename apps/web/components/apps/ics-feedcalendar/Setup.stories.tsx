import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import ICSFeedSetup from "./Setup";

const meta = {
  title: "Apps/ICS Feed Calendar/Setup",
  component: ICSFeedSetup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/ics-feedcalendar/setup",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen w-screen">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ICSFeedSetup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view of the ICS Feed Calendar setup form.
 * Shows a single URL input field with options to add more feeds.
 */
export const Default: Story = {};

/**
 * Interactive story demonstrating the ability to add multiple ICS feed URLs.
 * Users can click the "Add" button to add additional URL input fields.
 */
export const WithMultipleURLs: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the component to render
    await waitFor(() => {
      expect(canvas.getByPlaceholderText("https://example.com/calendar.ics")).toBeInTheDocument();
    });

    // Find and click the add button to add more URL fields
    const addButton = canvas.getByRole("button", { name: /add/i });
    await userEvent.click(addButton);

    // Wait for the second input to appear
    await waitFor(() => {
      const inputs = canvas.getAllByPlaceholderText("https://example.com/calendar.ics");
      expect(inputs).toHaveLength(2);
    });

    // Fill in the first URL
    const inputs = canvas.getAllByPlaceholderText("https://example.com/calendar.ics");
    await userEvent.type(inputs[0], "https://calendar1.example.com/feed.ics");
    await userEvent.type(inputs[1], "https://calendar2.example.com/feed.ics");
  },
};

/**
 * Story demonstrating the error state when form submission fails.
 * Shows how error messages are displayed to the user.
 */
export const WithErrorMessage: Story = {
  parameters: {
    msw: {
      handlers: [
        {
          method: "POST",
          url: "/api/integrations/ics-feedcalendar/add",
          status: 400,
          response: {
            message: "Invalid calendar URL format",
          },
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the component to render
    await waitFor(() => {
      expect(canvas.getByPlaceholderText("https://example.com/calendar.ics")).toBeInTheDocument();
    });

    // Fill in an invalid URL
    const input = canvas.getByPlaceholderText("https://example.com/calendar.ics");
    await userEvent.type(input, "invalid-url");

    // Submit the form
    const saveButton = canvas.getByRole("button", { name: /save/i });
    await userEvent.click(saveButton);
  },
};

/**
 * Story demonstrating error state with an admin action URL.
 * Shows the error alert with a "Go to Admin" button.
 */
export const WithErrorAndActionUrl: Story = {
  parameters: {
    msw: {
      handlers: [
        {
          method: "POST",
          url: "/api/integrations/ics-feedcalendar/add",
          status: 403,
          response: {
            message: "Insufficient permissions to add calendar feeds",
            actionUrl: "/settings/admin",
          },
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the component to render
    await waitFor(() => {
      expect(canvas.getByPlaceholderText("https://example.com/calendar.ics")).toBeInTheDocument();
    });

    // Fill in a URL
    const input = canvas.getByPlaceholderText("https://example.com/calendar.ics");
    await userEvent.type(input, "https://calendar.example.com/feed.ics");

    // Submit the form
    const saveButton = canvas.getByRole("button", { name: /save/i });
    await userEvent.click(saveButton);
  },
};

/**
 * Story demonstrating successful form submission.
 * After submission, the user should be redirected (mocked in Storybook).
 */
export const SuccessfulSubmission: Story = {
  parameters: {
    msw: {
      handlers: [
        {
          method: "POST",
          url: "/api/integrations/ics-feedcalendar/add",
          status: 200,
          response: {
            url: "/apps/installed/ics-feedcalendar",
          },
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the component to render
    await waitFor(() => {
      expect(canvas.getByPlaceholderText("https://example.com/calendar.ics")).toBeInTheDocument();
    });

    // Fill in a valid URL
    const input = canvas.getByPlaceholderText("https://example.com/calendar.ics");
    await userEvent.type(input, "https://calendar.example.com/feed.ics");

    // Submit the form
    const saveButton = canvas.getByRole("button", { name: /save/i });
    await userEvent.click(saveButton);

    // Button should show loading state
    await waitFor(() => {
      expect(saveButton).toHaveAttribute("data-loading", "true");
    });
  },
};

/**
 * Story demonstrating the ability to remove added URL fields.
 * The first URL field cannot be removed, but additional ones can be.
 */
export const RemovingURLFields: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the component to render
    await waitFor(() => {
      expect(canvas.getByPlaceholderText("https://example.com/calendar.ics")).toBeInTheDocument();
    });

    // Add a second URL field
    const addButton = canvas.getByRole("button", { name: /add/i });
    await userEvent.click(addButton);

    // Wait for the second input to appear
    await waitFor(() => {
      const inputs = canvas.getAllByPlaceholderText("https://example.com/calendar.ics");
      expect(inputs).toHaveLength(2);
    });

    // Add a third URL field
    await userEvent.click(addButton);

    await waitFor(() => {
      const inputs = canvas.getAllByPlaceholderText("https://example.com/calendar.ics");
      expect(inputs).toHaveLength(3);
    });

    // Find and click a delete button (trash icon)
    const deleteButtons = canvas.getAllByRole("button").filter((btn) => {
      const icon = btn.querySelector('[data-icon="trash"]');
      return icon !== null;
    });

    if (deleteButtons.length > 0) {
      await userEvent.click(deleteButtons[0]);

      // Verify one input was removed
      await waitFor(() => {
        const inputs = canvas.getAllByPlaceholderText("https://example.com/calendar.ics");
        expect(inputs).toHaveLength(2);
      });
    }
  },
};

/**
 * Story demonstrating the cancel functionality.
 * Clicking cancel should navigate back to the previous page.
 */
export const CancelAction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the component to render
    await waitFor(() => {
      expect(canvas.getByPlaceholderText("https://example.com/calendar.ics")).toBeInTheDocument();
    });

    // Fill in some data
    const input = canvas.getByPlaceholderText("https://example.com/calendar.ics");
    await userEvent.type(input, "https://calendar.example.com/feed.ics");

    // Click cancel
    const cancelButton = canvas.getByRole("button", { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
  },
};
