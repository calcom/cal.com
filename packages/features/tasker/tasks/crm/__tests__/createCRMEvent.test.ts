import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, beforeEach, vi } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";

import { createCRMEvent } from "../createCRMEvent";

interface User {
  id: number;
  email: string;
  name: string;
}

interface EventTypeMetadata {
  apps: {
    salesforce: {
      enabled: boolean;
      credentialId: number;
      appCategories: string[];
    };
  };
}

interface Booking {
  id: number;
  uid: string;
  status: BookingStatus;
  title: string;
  startTime: Date;
  endTime: Date;
  user: User;
  eventType: {
    metadata: EventTypeMetadata;
  };
}

interface CRMCredential {
  id: number;
  type: string;
  key: {
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number;
    key1?: string;
  };
  userId: number;
}

interface CRMManagerInterface {
  createEvent: (event: unknown) => Promise<{ id: string }>;
}

vi.mock("../lib/buildCalendarEvent", () => ({
  default: vi.fn().mockResolvedValue({
    title: "Test Event",
    description: "Test Description",
    startTime: new Date(),
    endTime: new Date(),
  }),
}));

const mockCreateEvent = vi.fn().mockResolvedValue({ id: "sf-event-123" });
vi.mock("@calcom/core/crmManager/crmManager", () => ({
  default: class MockCrmManager {
    private credential: CRMCredential;

    constructor(credential: CRMCredential) {
      this.credential = credential;
    }

    createEvent = mockCreateEvent;

    getManager(): CRMManagerInterface {
      return {
        createEvent: this.createEvent,
      };
    }
  },
}));

describe("createCRMEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEvent.mockClear();
    // Clear Prisma mocks
    prismaMock.booking.findUnique.mockReset();
    prismaMock.credential.findUnique.mockReset();
    prismaMock.bookingReference.createMany.mockReset();
  });

  it("should successfully create a Salesforce CRM event", async () => {
    const mockBooking: Booking = {
      id: 1,
      uid: "booking-123",
      status: BookingStatus.ACCEPTED,
      title: "Test Booking",
      startTime: new Date(),
      endTime: new Date(),
      user: {
        id: 1,
        email: "test@example.com",
        name: "Test User",
      },
      eventType: {
        metadata: {
          apps: {
            salesforce: {
              enabled: true,
              credentialId: 1,
              appCategories: ["crm"],
            },
          },
        },
      },
    };

    const mockCredential: CRMCredential = {
      id: 1,
      type: "salesforce_crm",
      key: {
        access_token: "mock_token",
        refresh_token: "mock_refresh",
        expiry_date: new Date().getTime() + 3600000,
      },
      userId: 1,
    };

    // Set up Prisma mocks with proper return values
    prismaMock.booking.findUnique.mockResolvedValueOnce(mockBooking);
    prismaMock.credential.findUnique.mockResolvedValueOnce(mockCredential);
    prismaMock.bookingReference.createMany.mockResolvedValueOnce({ count: 1 });

    const payload = JSON.stringify({
      bookingUid: "booking-123",
    });

    await createCRMEvent(payload);

    expect(mockCreateEvent).toHaveBeenCalled();
    expect(prismaMock.bookingReference.createMany).toHaveBeenCalledWith({
      data: [
        {
          type: "salesforce_crm",
          uid: "sf-event-123",
          meetingId: "sf-event-123",
          credentialId: 1,
          bookingId: 1,
        },
      ],
    });
  });

  it("should throw error for invalid payload", async () => {
    const invalidPayload = JSON.stringify({
      invalidField: "test",
    });

    await expect(createCRMEvent(invalidPayload)).rejects.toThrow("malformed payload in createCRMEvent");
  });

  it("should throw error when booking is not found", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null);

    const payload = JSON.stringify({
      bookingUid: "non-existent-booking",
    });

    await expect(createCRMEvent(payload)).rejects.toThrow("booking not found");
  });

  it("should handle case when Salesforce CRM is not enabled", async () => {
    const mockBooking: Booking = {
      id: 1,
      uid: "booking-123",
      status: BookingStatus.ACCEPTED,
      title: "Test Booking",
      startTime: new Date(),
      endTime: new Date(),
      user: {
        id: 1,
        email: "test@example.com",
        name: "Test User",
      },
      eventType: {
        metadata: {
          apps: {
            salesforce: {
              enabled: false,
              credentialId: 1,
              appCategories: ["crm"],
            },
          },
        },
      },
    };

    prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

    const payload = JSON.stringify({
      bookingUid: "booking-123",
    });

    await createCRMEvent(payload);

    expect(prismaMock.bookingReference.createMany).toHaveBeenCalledWith({
      data: [],
    });
  });

  it("should handle CRM creation error gracefully", async () => {
    const mockBooking: Booking = {
      id: 1,
      uid: "booking-123",
      status: BookingStatus.ACCEPTED,
      title: "Test Booking",
      startTime: new Date(),
      endTime: new Date(),
      user: {
        id: 1,
        email: "test@example.com",
        name: "Test User",
      },
      eventType: {
        metadata: {
          apps: {
            salesforce: {
              enabled: true,
              credentialId: 1,
              appCategories: ["crm"],
            },
          },
        },
      },
    };

    const mockCredential: CRMCredential = {
      id: 1,
      type: "salesforce_crm",
      key: { key1: "value1" },
      userId: 1,
    };

    prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
    prismaMock.credential.findFirst.mockResolvedValue(mockCredential);
    mockCreateEvent.mockRejectedValue(new Error("Salesforce API error"));

    const payload = JSON.stringify({
      bookingUid: "booking-123",
    });

    await createCRMEvent(payload);

    expect(prismaMock.bookingReference.createMany).toHaveBeenCalledWith({
      data: [],
    });
  });
});
