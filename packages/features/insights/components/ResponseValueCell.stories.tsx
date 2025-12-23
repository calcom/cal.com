import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResponseValueCell } from "./ResponseValueCell";

const meta = {
  component: ResponseValueCell,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ResponseValueCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    optionMap: {
      "opt1": "Option 1",
      "opt2": "Option 2",
    },
    values: ["opt1"],
    rowId: 1,
  },
};

export const TwoValues: Story = {
  args: {
    optionMap: {
      "opt1": "Option 1",
      "opt2": "Option 2",
      "opt3": "Option 3",
    },
    values: ["opt1", "opt2"],
    rowId: 2,
  },
};

export const ThreeValues: Story = {
  args: {
    optionMap: {
      "opt1": "Option 1",
      "opt2": "Option 2",
      "opt3": "Option 3",
    },
    values: ["opt1", "opt2", "opt3"],
    rowId: 3,
  },
};

export const ManyValues: Story = {
  args: {
    optionMap: {
      "opt1": "Option 1",
      "opt2": "Option 2",
      "opt3": "Option 3",
      "opt4": "Option 4",
      "opt5": "Option 5",
      "opt6": "Option 6",
    },
    values: ["opt1", "opt2", "opt3", "opt4", "opt5", "opt6"],
    rowId: 4,
  },
};

export const LongOptionLabels: Story = {
  args: {
    optionMap: {
      "opt1": "This is a very long option label that might overflow",
      "opt2": "Another extremely long label for testing purposes",
      "opt3": "Yet another long label to see how it behaves",
    },
    values: ["opt1", "opt2", "opt3"],
    rowId: 5,
  },
};

export const UnmappedValues: Story = {
  args: {
    optionMap: {
      "opt1": "Option 1",
    },
    values: ["opt1", "opt2", "opt3"],
    rowId: 6,
  },
};

export const Empty: Story = {
  args: {
    optionMap: {
      "opt1": "Option 1",
      "opt2": "Option 2",
    },
    values: [],
    rowId: 7,
  },
};

export const WithSpecialCharacters: Story = {
  args: {
    optionMap: {
      "opt1": "Option with emoji 🎉",
      "opt2": "Option & Special < > Characters",
      "opt3": "Option with 'quotes'",
    },
    values: ["opt1", "opt2", "opt3"],
    rowId: 8,
  },
};

export const NumericKeys: Story = {
  args: {
    optionMap: {
      "1": "First Choice",
      "2": "Second Choice",
      "3": "Third Choice",
      "4": "Fourth Choice",
    },
    values: ["1", "2", "3", "4"],
    rowId: 9,
  },
};
