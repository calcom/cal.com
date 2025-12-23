import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { useState } from "react";

import { CheckedSelect } from "./CheckedSelect";

type CheckedSelectOption = {
  avatar: string;
  label: string;
  value: string;
  disabled?: boolean;
};

const sampleOptions: CheckedSelectOption[] = [
  {
    avatar: "https://cal.com/stakeholder/peer.jpg",
    label: "John Doe",
    value: "john-doe",
  },
  {
    avatar: "https://cal.com/stakeholder/bailey.jpg",
    label: "Jane Smith",
    value: "jane-smith",
  },
  {
    avatar: "https://cal.com/stakeholder/alice.jpg",
    label: "Alice Johnson",
    value: "alice-johnson",
  },
  {
    avatar: "https://cal.com/stakeholder/peer.jpg",
    label: "Bob Williams",
    value: "bob-williams",
  },
  {
    avatar: "https://cal.com/stakeholder/bailey.jpg",
    label: "Carol Brown",
    value: "carol-brown",
    disabled: true,
  },
];

const meta = {
  component: CheckedSelect,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CheckedSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    options: sampleOptions,
    value: [],
    placeholder: "Select team members...",
    name: "team-members",
  },
};

export const WithSelectedValues: Story = {
  args: {
    options: sampleOptions,
    value: [sampleOptions[0], sampleOptions[1]],
    placeholder: "Select team members...",
    name: "team-members",
  },
};

export const SingleSelection: Story = {
  args: {
    options: sampleOptions,
    value: [sampleOptions[0]],
    placeholder: "Select team members...",
    name: "team-members",
  },
};

export const AllSelected: Story = {
  args: {
    options: sampleOptions.filter((opt) => !opt.disabled),
    value: sampleOptions.filter((opt) => !opt.disabled),
    placeholder: "Select team members...",
    name: "team-members",
  },
};

export const WithDisabledOptions: Story = {
  args: {
    options: sampleOptions,
    value: [],
    placeholder: "Select team members...",
    name: "team-members",
  },
};

export const CustomPlaceholder: Story = {
  args: {
    options: sampleOptions,
    value: [],
    placeholder: "Choose collaborators for this project...",
    name: "collaborators",
  },
};

export const Interactive: Story = {
  render: () => {
    const [selectedOptions, setSelectedOptions] = useState<CheckedSelectOption[]>([
      sampleOptions[0],
    ]);

    return (
      <div className="space-y-4">
        <CheckedSelect
          options={sampleOptions}
          value={selectedOptions}
          onChange={setSelectedOptions}
          placeholder="Select team members..."
          name="team-members"
        />
        <div className="text-sm text-gray-600">
          <strong>Selected:</strong> {selectedOptions.length} member(s)
        </div>
      </div>
    );
  },
};

export const LargeList: Story = {
  args: {
    options: Array.from({ length: 10 }, (_, i) => ({
      avatar: i % 2 === 0 ? "https://cal.com/stakeholder/peer.jpg" : "https://cal.com/stakeholder/bailey.jpg",
      label: `Team Member ${i + 1}`,
      value: `member-${i + 1}`,
    })),
    value: [],
    placeholder: "Select team members...",
    name: "team-members",
  },
};

export const WithManySelections: Story = {
  render: () => {
    const largeOptions = Array.from({ length: 8 }, (_, i) => ({
      avatar: i % 2 === 0 ? "https://cal.com/stakeholder/peer.jpg" : "https://cal.com/stakeholder/bailey.jpg",
      label: `Team Member ${i + 1}`,
      value: `member-${i + 1}`,
    }));

    return (
      <CheckedSelect
        options={largeOptions}
        value={largeOptions.slice(0, 5)}
        onChange={fn()}
        placeholder="Select team members..."
        name="team-members"
      />
    );
  },
  parameters: {
    layout: "padded",
  },
};

export const EventAssignment: Story = {
  args: {
    options: [
      {
        avatar: "https://cal.com/stakeholder/peer.jpg",
        label: "John Doe (Sales)",
        value: "john-sales",
      },
      {
        avatar: "https://cal.com/stakeholder/bailey.jpg",
        label: "Jane Smith (Support)",
        value: "jane-support",
      },
      {
        avatar: "https://cal.com/stakeholder/alice.jpg",
        label: "Alice Johnson (Engineering)",
        value: "alice-eng",
      },
    ],
    value: [],
    placeholder: "Assign team members to this event...",
    name: "event-assignment",
  },
};
