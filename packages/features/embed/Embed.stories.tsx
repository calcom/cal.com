import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { BookerLayouts } from "@calcom/prisma/zod-utils";

import { EmbedButton, EmbedDialog } from "./Embed";
import { EmbedTabName } from "./lib/EmbedTabs";
import { EmbedType } from "./types";

// Mock tabs configuration
const mockTabs = [
  {
    name: "HTML",
    href: "embedTabName=embed-code",
    type: "code" as const,
    Component: () => null,
  },
  {
    name: "React",
    href: "embedTabName=embed-react",
    type: "code" as const,
    Component: () => null,
  },
  {
    name: "Preview",
    href: "embedTabName=embed-preview",
    type: "preview" as const,
    Component: () => null,
  },
];

// Mock embed types
const mockTypes = [
  {
    type: "inline" as EmbedType,
    title: "Inline Embed",
    subtitle: "Embed the booking page directly into your website",
    illustration: <div className="h-20 w-20 bg-gray-200" />,
  },
  {
    type: "floating-popup" as EmbedType,
    title: "Floating Button",
    subtitle: "Add a floating button to your website",
    illustration: <div className="h-20 w-20 bg-gray-200" />,
  },
  {
    type: "element-click" as EmbedType,
    title: "Pop-up on Element Click",
    subtitle: "Show booking page when clicking an element",
    illustration: <div className="h-20 w-20 bg-gray-200" />,
  },
  {
    type: "email" as EmbedType,
    title: "Email Embed",
    subtitle: "Share booking slots via email",
    illustration: <div className="h-20 w-20 bg-gray-200" />,
  },
];

const meta = {
  component: EmbedDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    noQueryParamMode: {
      control: "boolean",
      description: "Whether to use query params or internal state for dialog management",
    },
    eventTypeHideOptionDisabled: {
      control: "boolean",
      description: "Disable the option to hide event type details",
    },
  },
} satisfies Meta<typeof EmbedDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default story showing the EmbedDialog in no-query-param mode.
 * This allows the dialog to be controlled via internal state.
 */
export const Default: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="space-y-4">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Open Embed Dialog
        </button>
        {isOpen && (
          <EmbedDialog
            {...args}
            types={mockTypes}
            tabs={mockTabs}
            eventTypeHideOptionDisabled={false}
            defaultBrandColor={{ brandColor: "#000000", darkBrandColor: "#ffffff" }}
            noQueryParamMode={true}
          />
        )}
      </div>
    );
  },
};

/**
 * EmbedButton component that triggers the embed dialog.
 * This is the typical way users would interact with the embed functionality.
 */
export const WithEmbedButton: Story = {
  render: () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Click the button below to open the embed dialog:</p>
      <EmbedButton
        embedUrl="https://cal.com/example/30min"
        namespace="example"
        eventId={123}
        noQueryParamMode={true}>
        Embed This Event
      </EmbedButton>
    </div>
  ),
};

/**
 * Inline embed type variant.
 * Shows the dialog configured for inline embedding.
 */
export const InlineEmbedType: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="space-y-4">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Open Inline Embed
        </button>
        {isOpen && (
          <EmbedDialog
            {...args}
            types={mockTypes.filter((t) => t.type === "inline")}
            tabs={mockTabs}
            eventTypeHideOptionDisabled={false}
            defaultBrandColor={{ brandColor: "#292929", darkBrandColor: "#fafafa" }}
            noQueryParamMode={true}
          />
        )}
      </div>
    );
  },
};

/**
 * Floating popup embed type variant.
 * Shows the dialog configured for floating button embedding.
 */
export const FloatingPopupEmbedType: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="space-y-4">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Open Floating Popup Embed
        </button>
        {isOpen && (
          <EmbedDialog
            {...args}
            types={mockTypes.filter((t) => t.type === "floating-popup")}
            tabs={mockTabs}
            eventTypeHideOptionDisabled={false}
            defaultBrandColor={{ brandColor: "#000000", darkBrandColor: "#ffffff" }}
            noQueryParamMode={true}
          />
        )}
      </div>
    );
  },
};

/**
 * Element click embed type variant.
 * Shows the dialog configured for element click embedding.
 */
export const ElementClickEmbedType: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="space-y-4">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Open Element Click Embed
        </button>
        {isOpen && (
          <EmbedDialog
            {...args}
            types={mockTypes.filter((t) => t.type === "element-click")}
            tabs={mockTabs}
            eventTypeHideOptionDisabled={false}
            defaultBrandColor={{ brandColor: "#000000", darkBrandColor: "#ffffff" }}
            noQueryParamMode={true}
          />
        )}
      </div>
    );
  },
};

/**
 * Custom brand colors variant.
 * Shows the dialog with custom brand colors configured.
 */
export const WithCustomBrandColors: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="space-y-4">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">
          Open with Custom Colors
        </button>
        {isOpen && (
          <EmbedDialog
            {...args}
            types={mockTypes}
            tabs={mockTabs}
            eventTypeHideOptionDisabled={false}
            defaultBrandColor={{ brandColor: "#8b5cf6", darkBrandColor: "#c4b5fd" }}
            noQueryParamMode={true}
          />
        )}
      </div>
    );
  },
};

/**
 * Event type hide option disabled variant.
 * Shows the dialog with the event type hide option disabled.
 */
export const EventTypeHideDisabled: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          This variant has the event type hide option disabled.
        </p>
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Open Dialog
        </button>
        {isOpen && (
          <EmbedDialog
            {...args}
            types={mockTypes}
            tabs={mockTabs}
            eventTypeHideOptionDisabled={true}
            defaultBrandColor={{ brandColor: "#000000", darkBrandColor: "#ffffff" }}
            noQueryParamMode={true}
          />
        )}
      </div>
    );
  },
};

/**
 * Multiple embed buttons variant.
 * Shows multiple embed buttons for different event types.
 */
export const MultipleEmbedButtons: Story = {
  render: () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Multiple event types with embed buttons:</p>
      <div className="flex flex-col gap-2">
        <EmbedButton
          embedUrl="https://cal.com/example/15min"
          namespace="example"
          eventId={1}
          noQueryParamMode={true}
          className="w-full">
          Embed 15 Min Meeting
        </EmbedButton>
        <EmbedButton
          embedUrl="https://cal.com/example/30min"
          namespace="example"
          eventId={2}
          noQueryParamMode={true}
          className="w-full">
          Embed 30 Min Meeting
        </EmbedButton>
        <EmbedButton
          embedUrl="https://cal.com/example/60min"
          namespace="example"
          eventId={3}
          noQueryParamMode={true}
          className="w-full">
          Embed 60 Min Meeting
        </EmbedButton>
      </div>
    </div>
  ),
};

/**
 * All embed types variant.
 * Shows the dialog with all available embed types.
 */
export const AllEmbedTypes: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          This shows all available embed types: Inline, Floating Button, Element Click, and Email.
        </p>
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Open All Embed Types
        </button>
        {isOpen && (
          <EmbedDialog
            {...args}
            types={mockTypes}
            tabs={mockTabs}
            eventTypeHideOptionDisabled={false}
            defaultBrandColor={{ brandColor: "#000000", darkBrandColor: "#ffffff" }}
            noQueryParamMode={true}
          />
        )}
      </div>
    );
  },
};
