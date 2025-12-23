import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import MultiEmail from "./MultiEmail";

const meta = {
  component: MultiEmail,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "400px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MultiEmail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => {
    const [emails, setEmails] = useState<string[]>([]);
    return <MultiEmail value={emails} setValue={setEmails} label="Add guests" readOnly={false} />;
  },
};

export const WithEmails: Story = {
  render: () => {
    const [emails, setEmails] = useState(["john@example.com", "jane@example.com"]);
    return <MultiEmail value={emails} setValue={setEmails} label="Guests" readOnly={false} />;
  },
};

export const ReadOnly: Story = {
  render: () => {
    const [emails, setEmails] = useState(["john@example.com", "jane@example.com", "bob@example.com"]);
    return <MultiEmail value={emails} setValue={setEmails} label="Attendees" readOnly={true} />;
  },
};

export const SingleEmail: Story = {
  render: () => {
    const [emails, setEmails] = useState(["contact@company.com"]);
    return (
      <MultiEmail
        value={emails}
        setValue={setEmails}
        label="Contact Email"
        readOnly={false}
        placeholder="Enter email address"
      />
    );
  },
};

export const WithPlaceholder: Story = {
  render: () => {
    const [emails, setEmails] = useState([""]);
    return (
      <MultiEmail
        value={emails}
        setValue={setEmails}
        label="Team Members"
        readOnly={false}
        placeholder="teammate@company.com"
      />
    );
  },
};
