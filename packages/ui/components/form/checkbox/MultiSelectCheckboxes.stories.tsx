import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import type { Option } from "./MultiSelectCheckboxes";
import MultiSelectCheckboxes from "./MultiSelectCheckboxes";

const meta = {
  component: MultiSelectCheckboxes,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MultiSelectCheckboxes>;

export default meta;
type Story = StoryObj<typeof meta>;

const teamOptions = [
  { value: "john", label: "John Doe" },
  { value: "jane", label: "Jane Smith" },
  { value: "bob", label: "Bob Wilson" },
  { value: "alice", label: "Alice Johnson" },
];

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState<Option[]>([]);
    return (
      <MultiSelectCheckboxes
        options={teamOptions}
        selected={selected}
        setSelected={setSelected}
        setValue={setSelected}
      />
    );
  },
};

export const WithPreselected: Story = {
  render: () => {
    const [selected, setSelected] = useState<Option[]>([
      { value: "john", label: "John Doe" },
      { value: "jane", label: "Jane Smith" },
    ]);
    return (
      <MultiSelectCheckboxes
        options={teamOptions}
        selected={selected}
        setSelected={setSelected}
        setValue={setSelected}
      />
    );
  },
};

export const EventTypes: Story = {
  render: () => {
    const options = [
      { value: "15min", label: "15 Min Meeting" },
      { value: "30min", label: "30 Min Meeting" },
      { value: "60min", label: "60 Min Meeting" },
      { value: "discovery", label: "Discovery Call" },
    ];
    const [selected, setSelected] = useState<Option[]>([]);
    return (
      <MultiSelectCheckboxes
        options={options}
        selected={selected}
        setSelected={setSelected}
        setValue={setSelected}
      />
    );
  },
};

export const Disabled: Story = {
  render: () => {
    const [selected, setSelected] = useState<Option[]>([{ value: "john", label: "John Doe" }]);
    return (
      <MultiSelectCheckboxes
        options={teamOptions}
        selected={selected}
        setSelected={setSelected}
        setValue={setSelected}
        isDisabled
      />
    );
  },
};

export const Loading: Story = {
  render: () => {
    const [selected, setSelected] = useState<Option[]>([]);
    return (
      <MultiSelectCheckboxes
        options={teamOptions}
        selected={selected}
        setSelected={setSelected}
        setValue={setSelected}
        isLoading
      />
    );
  },
};

export const CustomWidth: Story = {
  render: () => {
    const [selected, setSelected] = useState<Option[]>([]);
    return (
      <MultiSelectCheckboxes
        options={teamOptions}
        selected={selected}
        setSelected={setSelected}
        setValue={setSelected}
        className="w-80"
      />
    );
  },
};
