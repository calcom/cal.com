import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { ChargeCardDialog } from "./ChargeCardDialog";

const meta = {
  title: "Components/Dialog/ChargeCardDialog",
  component: ChargeCardDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="min-w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChargeCardDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story with controlled state
export const Default: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);
    return <ChargeCardDialog {...args} isOpenDialog={isOpen} setIsOpenDialog={setIsOpen} />;
  },
  args: {
    bookingId: 12345,
    paymentAmount: 5000, // $50.00 in cents
    paymentCurrency: "USD",
  },
};

// Story showing EUR currency
export const EuroCurrency: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);
    return <ChargeCardDialog {...args} isOpenDialog={isOpen} setIsOpenDialog={setIsOpen} />;
  },
  args: {
    bookingId: 12346,
    paymentAmount: 7500, // €75.00 in cents
    paymentCurrency: "EUR",
  },
};

// Story showing GBP currency
export const PoundCurrency: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);
    return <ChargeCardDialog {...args} isOpenDialog={isOpen} setIsOpenDialog={setIsOpen} />;
  },
  args: {
    bookingId: 12347,
    paymentAmount: 10000, // £100.00 in cents
    paymentCurrency: "GBP",
  },
};

// Story showing a small amount
export const SmallAmount: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);
    return <ChargeCardDialog {...args} isOpenDialog={isOpen} setIsOpenDialog={setIsOpen} />;
  },
  args: {
    bookingId: 12348,
    paymentAmount: 999, // $9.99 in cents
    paymentCurrency: "USD",
  },
};

// Story showing a large amount
export const LargeAmount: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);
    return <ChargeCardDialog {...args} isOpenDialog={isOpen} setIsOpenDialog={setIsOpen} />;
  },
  args: {
    bookingId: 12349,
    paymentAmount: 250000, // $2,500.00 in cents
    paymentCurrency: "USD",
  },
};

// Story demonstrating closed state
export const Closed: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Open Dialog
        </button>
        <ChargeCardDialog {...args} isOpenDialog={isOpen} setIsOpenDialog={setIsOpen} />
      </>
    );
  },
  args: {
    bookingId: 12350,
    paymentAmount: 5000,
    paymentCurrency: "USD",
  },
};
