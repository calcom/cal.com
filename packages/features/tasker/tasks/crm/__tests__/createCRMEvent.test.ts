import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, it, beforeEach, vi } from "vitest";

import { RetryableError } from "@calcom/lib/crmManager/errors";
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
vi.mock("@calcom/features/crmManager/crmManager", () => ({
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
    prismaMock.bookingReference.findMany.mockReset();
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
    prismaMock.credential.findMany.mockResolvedValueOnce([mockCredential]);
    prismaMock.bookingReference.createMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.bookingReference.findMany.mockResolvedValueOnce([]);
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
    prismaMock.credential.findMany.mockResolvedValueOnce([]);

    const payload = JSON.stringify({
      bookingUid: "booking-123",
    });

    await createCRMEvent(payload);

    expect(prismaMock.bookingReference.createMany).toHaveBeenCalledWith({
      data: [],
    });
  });

  it("should not throw if there is 'Credential not found' error", async () => {
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

    prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
    prismaMock.credential.findUnique.mockResolvedValue(null);
    prismaMock.credential.findMany.mockResolvedValueOnce([]);
    prismaMock.bookingReference.findMany.mockResolvedValueOnce([]);

    mockCreateEvent.mockRejectedValue(new Error("Salesforce API error"));

    const payload = JSON.stringify({
      bookingUid: "booking-123",
    });

    await createCRMEvent(payload);

    expect(prismaMock.bookingReference.createMany).toHaveBeenCalledWith({
      data: [],
    });
  });

  it("should throw(and thus retry) if there is RetryableError from `createEvent`", async () => {
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
    prismaMock.credential.findUnique.mockResolvedValue(mockCredential);
    prismaMock.credential.findMany.mockResolvedValueOnce([mockCredential]);
    prismaMock.bookingReference.findMany.mockResolvedValueOnce([]);

    mockCreateEvent.mockRejectedValue(new RetryableError("Salesforce API Retryable error"));

    const payload = JSON.stringify({
      bookingUid: "booking-123",
    });

    await expect(createCRMEvent(payload)).rejects.toThrow("Salesforce API Retryable error");
  });

  it("should not throw(and thus not retry) if there is non-RetryableError from `createEvent`", async () => {
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
    prismaMock.credential.findUnique.mockResolvedValue(mockCredential);
    prismaMock.credential.findMany.mockResolvedValueOnce([mockCredential]);
    prismaMock.bookingReference.findMany.mockResolvedValueOnce([]);

    mockCreateEvent.mockRejectedValue(new Error("Salesforce API error"));

    const payload = JSON.stringify({
      bookingUid: "booking-123",
    });

    await createCRMEvent(payload);

    expect(prismaMock.bookingReference.createMany).toHaveBeenCalledWith({
      data: [],
    });
  });

  it("should process second app evenif first app throws error in processing", async () => {
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
            hubspot: {
              enabled: true,
              credentialId: 2,
              appCategories: ["crm"],
            },
          },
        },
      },
    };

    const mockSalesforceCredential: CRMCredential = {
      id: 1,
      type: "salesforce_crm",
      key: { key1: "value1" },
      userId: 1,
    };

    const mockHubspotCredential: CRMCredential = {
      id: 2,
      type: "hubspot",
      key: { key1: "value1" },
      userId: 1,
    };

    prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

    // First call returns Salesforce credential and second call returns Hubspot credential
    prismaMock.credential.findUnique
      .mockResolvedValueOnce(mockSalesforceCredential)
      .mockResolvedValueOnce(mockHubspotCredential);

    prismaMock.credential.findMany.mockResolvedValueOnce([
      mockSalesforceCredential,
      mockHubspotCredential,
    ]);

    prismaMock.bookingReference.findMany.mockResolvedValueOnce([]);

    // Throw error for first app and resolve for second app
    mockCreateEvent
      .mockRejectedValueOnce(new Error("Salesforce API error"))
      .mockResolvedValueOnce({ id: "hubspot-event-123" });

    const payload = JSON.stringify({
      bookingUid: "booking-123",
    });

    await createCRMEvent(payload);

    expect(prismaMock.bookingReference.createMany).toHaveBeenCalledWith({
      data: [
        {
          type: "hubspot",
          uid: "hubspot-event-123",
          meetingId: "hubspot-event-123",
          credentialId: 2,
          bookingId: 1,
        },
      ],
    });
  });

  it("should skip a credential from creatingEvent if bookingReference already exists(Helpful in case of retry)", async () => {
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

    const mockSalesforceCredential: CRMCredential = {
      id: 1,
      type: "salesforce_crm",
      key: { key1: "value1" },
      userId: 1,
    };

    prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
    prismaMock.credential.findUnique.mockResolvedValueOnce(mockSalesforceCredential);
    prismaMock.credential.findMany.mockResolvedValueOnce([mockSalesforceCredential]);
    prismaMock.bookingReference.findMany.mockResolvedValueOnce([
      { id: 1, type: "salesforce_crm", uid: "sf-event-123", credentialId: 1, bookingId: 1 },
    ]);

    const payload = JSON.stringify({
      bookingUid: "booking-123",
    });

    await createCRMEvent(payload);

    expect(prismaMock.bookingReference.createMany).toHaveBeenCalledWith({
      data: [],
    });
  });
});
