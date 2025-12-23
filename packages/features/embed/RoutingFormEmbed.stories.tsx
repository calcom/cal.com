import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RoutingFormEmbedDialog, RoutingFormEmbedButton } from "./RoutingFormEmbed";

const meta = {
  title: "Features/Embed/RoutingFormEmbed",
  component: RoutingFormEmbedDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="min-h-[600px] w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RoutingFormEmbedDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data for stories
const mockUserData = {
  id: 1,
  username: "testuser",
  email: "test@example.com",
  brandColor: "#292929",
  darkBrandColor: "#fafafa",
  name: "Test User",
  timeZone: "America/New_York",
  locale: "en",
};

/**
 * Default RoutingFormEmbedDialog story
 *
 * This shows the routing form embed dialog with all standard embed types.
 * The dialog allows users to choose how to embed their routing form:
 * - Inline: Embedded directly in a page
 * - Floating Popup: A floating button that opens the form
 * - On Element Click: Triggered when clicking specific elements
 */
export const Default: Story = {
  render: function DefaultStory() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Click the button below to open the Routing Form Embed Dialog
        </p>
        <RoutingFormEmbedButton
          embedUrl="routing/form"
          namespace="routing"
          eventId={1}>
          Open Routing Form Embed
        </RoutingFormEmbedButton>
        <RoutingFormEmbedDialog />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "The default routing form embed dialog. Users can select different embed types for their routing forms, excluding email embeds which are not supported for routing forms.",
      },
    },
  },
};

/**
 * RoutingFormEmbedButton story
 *
 * Shows the embed button component in isolation with different variants.
 */
export const EmbedButton: Story = {
  render: function EmbedButtonStory() {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">Default Button</p>
          <RoutingFormEmbedButton
            embedUrl="routing/example"
            namespace="routing"
            eventId={1}>
            Embed Routing Form
          </RoutingFormEmbedButton>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-2">Custom Styled Button</p>
          <RoutingFormEmbedButton
            embedUrl="routing/custom"
            namespace="custom"
            eventId={2}
            className="bg-blue-500 hover:bg-blue-600 text-white">
            Custom Embed Button
          </RoutingFormEmbedButton>
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-2">Different Event ID</p>
          <RoutingFormEmbedButton
            embedUrl="routing/sales-form"
            namespace="sales"
            eventId={999}>
            Sales Form Embed
          </RoutingFormEmbedButton>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "The RoutingFormEmbedButton component triggers the embed dialog. It supports custom styling and can be used with different event IDs and namespaces.",
      },
    },
  },
};

/**
 * Dialog with Custom Brand Colors
 *
 * Shows how the embed dialog adapts to different brand colors.
 */
export const WithCustomBrandColors: Story = {
  render: function CustomBrandColorsStory() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          This example shows the embed dialog with custom brand colors configured.
          The dialog will use these colors in the embed code generation.
        </p>
        <RoutingFormEmbedButton
          embedUrl="routing/branded-form"
          namespace="branded"
          eventId={1}>
          Open Branded Embed Dialog
        </RoutingFormEmbedButton>
        <RoutingFormEmbedDialog />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "When a user has custom brand colors configured, the embed dialog will include these in the generated embed code.",
      },
    },
  },
};

/**
 * Multiple Buttons Example
 *
 * Shows how multiple embed buttons can be used on the same page.
 */
export const MultipleEmbedButtons: Story = {
  render: function MultipleButtonsStory() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Marketing Form</h3>
          <p className="text-sm text-gray-600 mb-2">
            Embed button for marketing routing form
          </p>
          <RoutingFormEmbedButton
            embedUrl="routing/marketing"
            namespace="marketing"
            eventId={101}>
            Embed Marketing Form
          </RoutingFormEmbedButton>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Sales Form</h3>
          <p className="text-sm text-gray-600 mb-2">
            Embed button for sales routing form
          </p>
          <RoutingFormEmbedButton
            embedUrl="routing/sales"
            namespace="sales"
            eventId={102}>
            Embed Sales Form
          </RoutingFormEmbedButton>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Support Form</h3>
          <p className="text-sm text-gray-600 mb-2">
            Embed button for support routing form
          </p>
          <RoutingFormEmbedButton
            embedUrl="routing/support"
            namespace="support"
            eventId={103}>
            Embed Support Form
          </RoutingFormEmbedButton>
        </div>

        <RoutingFormEmbedDialog />
      </div>
    );
  },
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Multiple routing form embed buttons can be used on the same page, each with different configurations and event IDs.",
      },
    },
  },
};

/**
 * Button as Custom Element
 *
 * Shows how the embed button can be rendered as a custom element type.
 */
export const ButtonAsCustomElement: Story = {
  render: function CustomElementStory() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          The embed button can be rendered as different HTML elements using the `as` prop.
        </p>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">As default button:</p>
            <RoutingFormEmbedButton
              embedUrl="routing/form1"
              namespace="default"
              eventId={1}>
              Default Button Element
            </RoutingFormEmbedButton>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">With custom className:</p>
            <RoutingFormEmbedButton
              embedUrl="routing/form2"
              namespace="custom-class"
              eventId={2}
              className="bg-purple-500 hover:bg-purple-600">
              Custom Styled Element
            </RoutingFormEmbedButton>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "The RoutingFormEmbedButton component accepts an `as` prop to render as different element types, and supports custom className for styling.",
      },
    },
  },
};

/**
 * Compact Button Variant
 *
 * Shows a more compact version of the embed button.
 */
export const CompactButton: Story = {
  render: function CompactButtonStory() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-2">
          Compact embed button suitable for limited spaces
        </p>
        <RoutingFormEmbedButton
          embedUrl="routing/compact"
          namespace="compact"
          eventId={1}
          className="text-sm px-3 py-1.5">
          Embed
        </RoutingFormEmbedButton>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "A compact version of the embed button, useful when space is limited or when you want a more subtle call-to-action.",
      },
    },
  },
};

/**
 * Button with Different Namespaces
 *
 * Demonstrates how different namespaces affect the embed configuration.
 */
export const DifferentNamespaces: Story = {
  render: function DifferentNamespacesStory() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          Different namespaces help organize and differentiate multiple embeds on the same page.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <p className="text-xs font-semibold mb-2">Namespace: "onboarding"</p>
            <RoutingFormEmbedButton
              embedUrl="routing/onboarding"
              namespace="onboarding"
              eventId={1}>
              Onboarding Form
            </RoutingFormEmbedButton>
          </div>

          <div className="p-4 border rounded">
            <p className="text-xs font-semibold mb-2">Namespace: "feedback"</p>
            <RoutingFormEmbedButton
              embedUrl="routing/feedback"
              namespace="feedback"
              eventId={2}>
              Feedback Form
            </RoutingFormEmbedButton>
          </div>

          <div className="p-4 border rounded">
            <p className="text-xs font-semibold mb-2">Namespace: "contact"</p>
            <RoutingFormEmbedButton
              embedUrl="routing/contact"
              namespace="contact"
              eventId={3}>
              Contact Form
            </RoutingFormEmbedButton>
          </div>

          <div className="p-4 border rounded">
            <p className="text-xs font-semibold mb-2">Namespace: "application"</p>
            <RoutingFormEmbedButton
              embedUrl="routing/application"
              namespace="application"
              eventId={4}>
              Application Form
            </RoutingFormEmbedButton>
          </div>
        </div>

        <RoutingFormEmbedDialog />
      </div>
    );
  },
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Namespaces are used to differentiate multiple routing form embeds on the same page. Each namespace creates an isolated embed instance.",
      },
    },
  },
};
