import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { useState } from "react";

import { LocationType } from "@calcom/app-store/locations";

import { EditLocationDialog } from "./EditLocationDialog";

const meta = {
  title: "Components/Dialog/EditLocationDialog",
  component: EditLocationDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100vw", height: "100vh" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EditLocationDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to manage dialog state
const DialogWrapper = (args: any) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <EditLocationDialog
      {...args}
      isOpenDialog={isOpen}
      setShowLocationModal={setIsOpen}
      saveLocation={async (data) => {
        console.log("Saving location:", data);
        args.saveLocation?.(data);
      }}
    />
  );
};

export const Default: Story = {
  args: {
    saveLocation: fn(),
    booking: {
      location: "integrations:zoom",
    },
    isOpenDialog: true,
    setShowLocationModal: fn(),
    setSelectedLocation: fn(),
    setEditingLocationType: fn(),
  },
  render: (args) => <DialogWrapper {...args} />,
};

export const WithPhoneLocation: Story = {
  args: {
    saveLocation: fn(),
    booking: {
      location: "+1234567890",
    },
    isOpenDialog: true,
    setShowLocationModal: fn(),
    setSelectedLocation: fn(),
    setEditingLocationType: fn(),
  },
  render: (args) => <DialogWrapper {...args} />,
};

export const WithInPersonLocation: Story = {
  args: {
    saveLocation: fn(),
    booking: {
      location: "123 Main St, New York, NY 10001",
    },
    defaultValues: [
      {
        type: LocationType.InPerson,
        address: "123 Main St, New York, NY 10001",
        displayLocationPublicly: true,
      },
    ],
    isOpenDialog: true,
    setShowLocationModal: fn(),
    setSelectedLocation: fn(),
    setEditingLocationType: fn(),
  },
  render: (args) => <DialogWrapper {...args} />,
};

export const WithGoogleMeet: Story = {
  args: {
    saveLocation: fn(),
    booking: {
      location: "integrations:google:meet",
    },
    isOpenDialog: true,
    setShowLocationModal: fn(),
    setSelectedLocation: fn(),
    setEditingLocationType: fn(),
  },
  render: (args) => <DialogWrapper {...args} />,
};

export const WithLink: Story = {
  args: {
    saveLocation: fn(),
    booking: {
      location: "https://example.com/meeting",
    },
    defaultValues: [
      {
        type: LocationType.Link,
        link: "https://example.com/meeting",
      },
    ],
    isOpenDialog: true,
    setShowLocationModal: fn(),
    setSelectedLocation: fn(),
    setEditingLocationType: fn(),
  },
  render: (args) => <DialogWrapper {...args} />,
};

export const WithTeamId: Story = {
  args: {
    saveLocation: fn(),
    booking: {
      location: "integrations:zoom",
    },
    teamId: 123,
    isOpenDialog: true,
    setShowLocationModal: fn(),
    setSelectedLocation: fn(),
    setEditingLocationType: fn(),
  },
  render: (args) => <DialogWrapper {...args} />,
};

export const WithPreselectedLocation: Story = {
  args: {
    saveLocation: fn(),
    booking: {
      location: "integrations:zoom",
    },
    selection: {
      label: "Zoom Video",
      value: "integrations:zoom",
      credentialId: 456,
    },
    isOpenDialog: true,
    setShowLocationModal: fn(),
    setSelectedLocation: fn(),
    setEditingLocationType: fn(),
  },
  render: (args) => <DialogWrapper {...args} />,
};

export const NoCurrentLocation: Story = {
  args: {
    saveLocation: fn(),
    booking: {
      location: null,
    },
    isOpenDialog: true,
    setShowLocationModal: fn(),
    setSelectedLocation: fn(),
    setEditingLocationType: fn(),
  },
  render: (args) => <DialogWrapper {...args} />,
};
