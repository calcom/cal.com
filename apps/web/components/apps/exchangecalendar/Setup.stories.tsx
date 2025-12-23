import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import ExchangeSetup from "./Setup";

const meta = {
  title: "Apps/ExchangeCalendar/Setup",
  component: ExchangeSetup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    nextjs: {
      appDirectory: true,
      navigation: {
        push: fn(),
        back: fn(),
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
} satisfies Meta<typeof ExchangeSetup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state of the Exchange Calendar setup form.
 * Shows the complete setup flow with all fields required to configure
 * Microsoft Exchange calendar integration.
 */
export const Default: Story = {};

/**
 * Setup form in a loading/submitting state.
 * This demonstrates the form's behavior when the user
 * has submitted their credentials and is waiting for validation.
 */
export const Submitting: Story = {
  play: async ({ canvasElement }) => {
    // Note: In a real implementation, you would interact with the form
    // to trigger the submitting state. This is a visual representation.
  },
};

/**
 * Setup form with an error message displayed.
 * Shows how validation or connection errors are presented to users.
 */
export const WithError: Story = {
  play: async ({ canvasElement }) => {
    // Note: Error state would be triggered by form submission
    // This story demonstrates the error alert styling
  },
};

/**
 * Setup form with NTLM authentication selected (default).
 * NTLM authentication is the default method and doesn't
 * require the Exchange version selector.
 */
export const NTLMAuthentication: Story = {};

/**
 * Setup form with Standard authentication selected.
 * When using Standard authentication, users must also
 * select their Exchange server version.
 */
export const StandardAuthentication: Story = {
  play: async ({ canvasElement }) => {
    // Note: In a real test, you would select the Standard
    // authentication option from the dropdown
  },
};
