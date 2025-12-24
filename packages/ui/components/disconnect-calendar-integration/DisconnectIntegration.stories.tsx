import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { useState } from "react";

import { DisconnectIntegrationComponent } from "./DisconnectIntegration";

const meta = {
  component: DisconnectIntegrationComponent,
  title: "UI/DisconnectIntegration",
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DisconnectIntegrationComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultStory() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
      <DisconnectIntegrationComponent
        label="Disconnect"
        isModalOpen={isModalOpen}
        onModalOpen={() => setIsModalOpen(!isModalOpen)}
        onDeletionConfirmation={fn()}
      />
    );
  },
};

export const WithTrashIcon: Story = {
  render: function WithTrashIconStory() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
      <DisconnectIntegrationComponent
        label="Remove"
        trashIcon={true}
        isModalOpen={isModalOpen}
        onModalOpen={() => setIsModalOpen(!isModalOpen)}
        onDeletionConfirmation={fn()}
      />
    );
  },
};

export const IconOnly: Story = {
  render: function IconOnlyStory() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
      <DisconnectIntegrationComponent
        trashIcon={true}
        isModalOpen={isModalOpen}
        onModalOpen={() => setIsModalOpen(!isModalOpen)}
        onDeletionConfirmation={fn()}
      />
    );
  },
};

export const GlobalIntegration: Story = {
  render: function GlobalIntegrationStory() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
      <DisconnectIntegrationComponent
        label="Disconnect"
        isGlobal={true}
        isModalOpen={isModalOpen}
        onModalOpen={() => setIsModalOpen(!isModalOpen)}
        onDeletionConfirmation={fn()}
      />
    );
  },
};

export const Disabled: Story = {
  render: function DisabledStory() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
      <DisconnectIntegrationComponent
        label="Disconnect"
        disabled={true}
        isModalOpen={isModalOpen}
        onModalOpen={() => setIsModalOpen(!isModalOpen)}
        onDeletionConfirmation={fn()}
      />
    );
  },
};

export const CustomButtonColor: Story = {
  render: function CustomButtonColorStory() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
      <DisconnectIntegrationComponent
        label="Remove Integration"
        isModalOpen={isModalOpen}
        onModalOpen={() => setIsModalOpen(!isModalOpen)}
        onDeletionConfirmation={fn()}
        buttonProps={{ color: "secondary" }}
      />
    );
  },
};

export const DialogOpen: Story = {
  render: function DialogOpenStory() {
    const [isModalOpen, setIsModalOpen] = useState(true);

    return (
      <DisconnectIntegrationComponent
        label="Disconnect"
        isModalOpen={isModalOpen}
        onModalOpen={() => setIsModalOpen(!isModalOpen)}
        onDeletionConfirmation={fn()}
      />
    );
  },
};
