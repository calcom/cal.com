import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { CheckedTeamSelect } from "./CheckedTeamSelect";
import type { CheckedSelectOption } from "./CheckedTeamSelect";

const mockOptions: CheckedSelectOption[] = [
  {
    avatar: "https://cal.com/stakeholder/peer.jpg",
    label: "John Doe",
    value: "user-1",
    priority: 2,
    weight: 100,
    isFixed: false,
    disabled: false,
    defaultScheduleId: 1,
    groupId: null,
  },
  {
    avatar: "https://cal.com/stakeholder/bailey.jpg",
    label: "Jane Smith",
    value: "user-2",
    priority: 3,
    weight: 80,
    isFixed: false,
    disabled: false,
    defaultScheduleId: 2,
    groupId: null,
  },
  {
    avatar: "https://cal.com/stakeholder/alex.jpg",
    label: "Alex Johnson",
    value: "user-3",
    priority: 1,
    weight: 60,
    isFixed: false,
    disabled: false,
    defaultScheduleId: 3,
    groupId: null,
  },
  {
    avatar: "https://cal.com/stakeholder/chris.jpg",
    label: "Chris Brown",
    value: "user-4",
    priority: 4,
    weight: 120,
    isFixed: false,
    disabled: false,
    defaultScheduleId: 4,
    groupId: null,
  },
  {
    avatar: "https://cal.com/stakeholder/sam.jpg",
    label: "Sam Wilson",
    value: "user-5",
    priority: 0,
    weight: 50,
    isFixed: false,
    disabled: false,
    defaultScheduleId: 5,
    groupId: null,
  },
];

const mockOptionsWithFixed: CheckedSelectOption[] = [
  ...mockOptions.slice(0, 2),
  {
    avatar: "https://cal.com/stakeholder/admin.jpg",
    label: "Admin User (Fixed)",
    value: "user-admin",
    priority: 2,
    weight: 100,
    isFixed: true,
    disabled: false,
    defaultScheduleId: 6,
    groupId: null,
  },
  ...mockOptions.slice(2),
];

const meta = {
  component: CheckedTeamSelect,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onChange: fn(),
    groupId: null,
  },
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CheckedTeamSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    options: mockOptions,
    value: [],
    name: "team-members",
    placeholder: "Select team members...",
    isRRWeightsEnabled: false,
  },
};

export const WithSelectedMembers: Story = {
  args: {
    options: mockOptions,
    value: [mockOptions[0], mockOptions[1]],
    name: "team-members",
    placeholder: "Select team members...",
    isRRWeightsEnabled: false,
  },
};

export const WithWeightsEnabled: Story = {
  args: {
    options: mockOptions,
    value: [mockOptions[0], mockOptions[1], mockOptions[2]],
    name: "team-members",
    placeholder: "Select team members...",
    isRRWeightsEnabled: true,
  },
};

export const WithFixedMember: Story = {
  args: {
    options: mockOptionsWithFixed,
    value: [mockOptionsWithFixed[0], mockOptionsWithFixed[2]],
    name: "team-members",
    placeholder: "Select team members...",
    isRRWeightsEnabled: false,
  },
};

export const WithFixedMemberAndWeights: Story = {
  args: {
    options: mockOptionsWithFixed,
    value: [mockOptionsWithFixed[0], mockOptionsWithFixed[2], mockOptionsWithFixed[3]],
    name: "team-members",
    placeholder: "Select team members...",
    isRRWeightsEnabled: true,
  },
};

export const AllPriorityLevels: Story = {
  args: {
    options: mockOptions,
    value: mockOptions,
    name: "team-members",
    placeholder: "Select team members...",
    isRRWeightsEnabled: false,
  },
};

export const AllPriorityLevelsWithWeights: Story = {
  args: {
    options: mockOptions,
    value: mockOptions,
    name: "team-members",
    placeholder: "Select team members...",
    isRRWeightsEnabled: true,
  },
};

export const WithDisabledOptions: Story = {
  args: {
    options: mockOptions.map((opt, index) => ({
      ...opt,
      disabled: index % 2 === 0,
    })),
    value: [mockOptions[1]],
    name: "team-members",
    placeholder: "Select team members...",
    isRRWeightsEnabled: false,
  },
};

export const WithGroupId: Story = {
  args: {
    options: mockOptions.map((opt) => ({ ...opt, groupId: "group-1" })),
    value: [
      { ...mockOptions[0], groupId: "group-1" },
      { ...mockOptions[1], groupId: "group-1" },
    ],
    name: "team-members",
    placeholder: "Select team members...",
    isRRWeightsEnabled: false,
    groupId: "group-1",
  },
};

export const MixedGroups: Story = {
  args: {
    options: mockOptions.map((opt, index) => ({
      ...opt,
      groupId: index < 3 ? "group-1" : "group-2",
    })),
    value: [
      { ...mockOptions[0], groupId: "group-1" },
      { ...mockOptions[1], groupId: "group-1" },
      { ...mockOptions[3], groupId: "group-2" },
    ],
    name: "team-members",
    placeholder: "Select team members...",
    isRRWeightsEnabled: true,
    groupId: "group-1",
  },
};

export const SingleSelection: Story = {
  args: {
    options: mockOptions,
    value: [mockOptions[0]],
    name: "team-members",
    placeholder: "Select team members...",
    isRRWeightsEnabled: false,
  },
};

export const CustomPlaceholder: Story = {
  args: {
    options: mockOptions,
    value: [],
    name: "team-members",
    placeholder: "Add hosts to your event type...",
    isRRWeightsEnabled: false,
  },
};

export const EmptyState: Story = {
  args: {
    options: [],
    value: [],
    name: "team-members",
    placeholder: "No team members available",
    isRRWeightsEnabled: false,
  },
};

export const LargeTeam: Story = {
  args: {
    options: Array.from({ length: 20 }, (_, i) => ({
      avatar: `https://cal.com/stakeholder/peer.jpg`,
      label: `Team Member ${i + 1}`,
      value: `user-${i + 1}`,
      priority: i % 5,
      weight: 50 + i * 5,
      isFixed: false,
      disabled: false,
      defaultScheduleId: i + 1,
      groupId: null,
    })),
    value: Array.from({ length: 5 }, (_, i) => ({
      avatar: `https://cal.com/stakeholder/peer.jpg`,
      label: `Team Member ${i + 1}`,
      value: `user-${i + 1}`,
      priority: i % 5,
      weight: 50 + i * 5,
      isFixed: false,
      disabled: false,
      defaultScheduleId: i + 1,
      groupId: null,
    })),
    name: "team-members",
    placeholder: "Select team members...",
    isRRWeightsEnabled: true,
  },
};
