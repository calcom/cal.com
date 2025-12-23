import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { HttpError } from "@calcom/lib/http-error";

import { ErrorPage } from "./error-page";

const meta = {
  title: "Components/Error/ErrorPage",
  component: ErrorPage,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen min-w-[800px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ErrorPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    statusCode: 500,
    message: "Internal Server Error: Unable to process your request at this time.",
  },
};

export const Error404: Story = {
  args: {
    statusCode: 404,
    message: "The page you are looking for could not be found.",
  },
};

export const Error403: Story = {
  args: {
    statusCode: 403,
    message: "You do not have permission to access this resource.",
  },
};

export const Error400: Story = {
  args: {
    statusCode: 400,
    message: "Bad Request: The request could not be understood by the server.",
  },
};

export const Error503: Story = {
  args: {
    statusCode: 503,
    message: "Service Unavailable: The server is currently unable to handle the request.",
  },
};

export const WithStandardError: Story = {
  args: {
    statusCode: 500,
    message: "An unexpected error occurred while processing your booking.",
    error: new Error("Database connection timeout"),
  },
};

export const WithHttpError: Story = {
  args: {
    statusCode: 502,
    message: "Bad Gateway: Unable to connect to the upstream server.",
    error: new HttpError({
      statusCode: 502,
      message: "Bad Gateway",
      url: "https://api.cal.com/v1/bookings",
      cause: new Error("Connection refused"),
    }),
  },
};

export const WithDebugPanel: Story = {
  args: {
    statusCode: 500,
    message: "Internal Server Error: Failed to create booking due to validation error.",
    error: new Error("Validation failed: Invalid event type configuration"),
    displayDebug: true,
  },
};

export const WithHttpErrorAndDebug: Story = {
  args: {
    statusCode: 504,
    message: "Gateway Timeout: The server took too long to respond.",
    error: new HttpError({
      statusCode: 504,
      message: "Gateway Timeout",
      url: "https://api.cal.com/v1/availability",
      cause: new Error("Request timeout after 30000ms"),
    }),
    displayDebug: true,
  },
};

export const LongErrorMessage: Story = {
  args: {
    statusCode: 500,
    message:
      "Error ID: ERR-2025-12-23-ABC123 | Timestamp: 2025-12-23T10:30:00Z | Service: booking-service | Database: Connection pool exhausted after 5000ms | Stack Trace: at BookingService.create (/app/services/booking.js:142:15) | Request ID: req_abc123xyz789 | User ID: usr_456def | Please include this information when contacting support.",
  },
};

export const WithResetCallback: Story = {
  args: {
    statusCode: 500,
    message: "An error occurred while loading your calendar data. You can try again to reload the page.",
    error: new Error("Failed to fetch calendar events"),
    reset: () => {
      console.log("Reset callback triggered - page will reload");
    },
  },
};

export const MinimalError: Story = {
  args: {
    statusCode: 500,
  },
};

export const WithoutStatusCode: Story = {
  args: {
    message: "An unexpected error occurred. Please try again later.",
    error: new Error("Unknown error"),
  },
};

export const ComplexHttpErrorWithDebug: Story = {
  args: {
    statusCode: 422,
    message:
      "Unprocessable Entity: The booking request contains invalid data. Event ID: evt_123abc | User ID: usr_456def | Timestamp: 2025-12-23T15:45:00Z",
    error: new HttpError({
      statusCode: 422,
      message: "Validation Error: Event type does not accept bookings at this time",
      url: "https://api.cal.com/v1/bookings/create",
      cause: new Error("Event type is disabled or archived"),
    }),
    displayDebug: true,
  },
};

export const NetworkError: Story = {
  args: {
    statusCode: 0,
    message:
      "Network Error: Unable to reach the server. Please check your internet connection and try again.",
    error: new Error("Network request failed"),
  },
};

export const DatabaseError: Story = {
  args: {
    statusCode: 500,
    message:
      "Database Error: Unable to retrieve booking information. Error Code: DB_001 | Connection: primary-db-pool | Timestamp: 2025-12-23T12:00:00Z",
    error: new Error("ECONNREFUSED: Connection refused to database"),
    displayDebug: true,
  },
};
