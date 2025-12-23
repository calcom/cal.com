import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import BookingPageErrorBoundary from "./BookingPageErrorBoundary";

const meta = {
  title: "Components/Error/BookingPageErrorBoundary",
  component: BookingPageErrorBoundary,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof BookingPageErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

// Component that throws a generic error
const GenericErrorComponent = () => {
  throw new Error("Failed to load booking page");
};

// Component that throws a network error
const NetworkErrorComponent = () => {
  const error = new Error("Network request failed");
  error.name = "NetworkError";
  throw error;
};

// Component that throws a validation error
const ValidationErrorComponent = () => {
  const error = new Error("Invalid booking parameters: eventTypeId is required");
  error.name = "ValidationError";
  throw error;
};

// Component that throws an error with a long stack trace
const DetailedErrorComponent = () => {
  const error = new Error("Detailed error with stack trace");
  error.stack = `Error: Detailed error with stack trace
    at DetailedErrorComponent (BookingPageErrorBoundary.stories.tsx:45:19)
    at renderWithHooks (react-dom.development.js:14985:18)
    at mountIndeterminateComponent (react-dom.development.js:17811:13)
    at beginWork (react-dom.development.js:19049:16)
    at HTMLUnknownElement.callCallback (react-dom.development.js:3945:14)
    at Object.invokeGuardedCallbackDev (react-dom.development.js:3994:16)`;
  throw error;
};

// Component that renders successfully
const SuccessfulComponent = () => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="mb-4 text-2xl font-semibold">Booking Page</h2>
      <p className="mb-4 text-gray-600">
        This is a successful booking page render. No errors occurred.
      </p>
      <div className="space-y-2">
        <div className="rounded bg-gray-100 p-3">
          <p className="text-sm font-medium">Event Type: 30 Min Meeting</p>
        </div>
        <div className="rounded bg-gray-100 p-3">
          <p className="text-sm font-medium">Duration: 30 minutes</p>
        </div>
        <div className="rounded bg-gray-100 p-3">
          <p className="text-sm font-medium">Status: Available</p>
        </div>
      </div>
    </div>
  );
};

export const Default: Story = {
  render: () => (
    <BookingPageErrorBoundary>
      <GenericErrorComponent />
    </BookingPageErrorBoundary>
  ),
};

export const NetworkError: Story = {
  render: () => (
    <BookingPageErrorBoundary>
      <NetworkErrorComponent />
    </BookingPageErrorBoundary>
  ),
};

export const ValidationError: Story = {
  render: () => (
    <BookingPageErrorBoundary>
      <ValidationErrorComponent />
    </BookingPageErrorBoundary>
  ),
};

export const DetailedError: Story = {
  render: () => (
    <BookingPageErrorBoundary>
      <DetailedErrorComponent />
    </BookingPageErrorBoundary>
  ),
};

export const NoError: Story = {
  render: () => (
    <BookingPageErrorBoundary>
      <SuccessfulComponent />
    </BookingPageErrorBoundary>
  ),
};

export const MultipleChildrenWithError: Story = {
  render: () => (
    <BookingPageErrorBoundary>
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="font-medium">Header Section</p>
        </div>
        <GenericErrorComponent />
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="font-medium">Footer Section (won't render due to error above)</p>
        </div>
      </div>
    </BookingPageErrorBoundary>
  ),
};
