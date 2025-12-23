import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import ErrorBoundary from "./ErrorBoundary";

const meta = {
  component: ErrorBoundary,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

// Component that throws an error
const BuggyComponent = () => {
  throw new Error("Test error from component");
};

export const WithError: Story = {
  render: () => (
    <ErrorBoundary>
      <BuggyComponent />
    </ErrorBoundary>
  ),
};

export const WithCustomMessage: Story = {
  render: () => (
    <ErrorBoundary message="Oops! Something unexpected happened.">
      <BuggyComponent />
    </ErrorBoundary>
  ),
};

export const WithoutError: Story = {
  render: () => (
    <ErrorBoundary>
      <div className="border-subtle rounded-lg border p-4">
        <p className="text-emphasis">This content renders normally</p>
        <p className="text-subtle text-sm">No errors here!</p>
      </div>
    </ErrorBoundary>
  ),
};

export const WrappingMultipleComponents: Story = {
  render: () => (
    <ErrorBoundary message="One of the components failed to load">
      <div className="space-y-4">
        <div className="border-subtle rounded-lg border p-4">
          <p className="text-emphasis">Component 1</p>
        </div>
        <div className="border-subtle rounded-lg border p-4">
          <p className="text-emphasis">Component 2</p>
        </div>
        <div className="border-subtle rounded-lg border p-4">
          <p className="text-emphasis">Component 3</p>
        </div>
      </div>
    </ErrorBoundary>
  ),
};
