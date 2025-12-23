import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { FilterSelect } from "./index";

const meta = {
  component: FilterSelect,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof FilterSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<string | number | null>(null);
    return (
      <FilterSelect
        title="Status"
        options={[
          { value: "active", label: "Active" },
          { value: "pending", label: "Pending" },
          { value: "cancelled", label: "Cancelled" },
        ]}
        selectedValue={value}
        onChange={setValue}
      />
    );
  },
};

export const WithSelectedValue: Story = {
  render: () => {
    const [value, setValue] = useState<string | number | null>("active");
    return (
      <FilterSelect
        title="Status"
        options={[
          { value: "active", label: "Active" },
          { value: "pending", label: "Pending" },
          { value: "cancelled", label: "Cancelled" },
        ]}
        selectedValue={value}
        onChange={setValue}
      />
    );
  },
};

export const WithIcon: Story = {
  render: () => {
    const [value, setValue] = useState<string | number | null>(null);
    return (
      <FilterSelect
        title="Filter"
        buttonIcon="filter"
        options={[
          { value: "all", label: "All Events" },
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past" },
        ]}
        selectedValue={value}
        onChange={setValue}
      />
    );
  },
};

export const EventTypes: Story = {
  render: () => {
    const [value, setValue] = useState<string | number | null>(null);
    return (
      <FilterSelect
        title="Event Type"
        buttonIcon="calendar"
        placeholder="Search event types..."
        options={[
          { value: "15min", label: "15 Min Meeting" },
          { value: "30min", label: "30 Min Meeting" },
          { value: "60min", label: "60 Min Meeting" },
          { value: "discovery", label: "Discovery Call" },
        ]}
        selectedValue={value}
        onChange={setValue}
      />
    );
  },
};

export const TeamMembers: Story = {
  render: () => {
    const [value, setValue] = useState<string | number | null>(null);
    return (
      <FilterSelect
        title="Team Member"
        buttonIcon="user"
        placeholder="Search members..."
        emptyText="No team members found"
        options={[
          { value: 1, label: "John Doe" },
          { value: 2, label: "Jane Smith" },
          { value: 3, label: "Bob Wilson" },
          { value: 4, label: "Alice Johnson" },
        ]}
        selectedValue={value}
        onChange={setValue}
      />
    );
  },
};

export const MultipleFilters: Story = {
  render: () => {
    const [status, setStatus] = useState<string | number | null>(null);
    const [type, setType] = useState<string | number | null>(null);
    return (
      <div className="flex gap-2">
        <FilterSelect
          title="Status"
          options={[
            { value: "confirmed", label: "Confirmed" },
            { value: "pending", label: "Pending" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          selectedValue={status}
          onChange={setStatus}
        />
        <FilterSelect
          title="Event Type"
          options={[
            { value: "meeting", label: "Meeting" },
            { value: "call", label: "Phone Call" },
            { value: "interview", label: "Interview" },
          ]}
          selectedValue={type}
          onChange={setType}
        />
      </div>
    );
  },
};
