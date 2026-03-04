import { DailyLocationType } from "@calcom/app-store/locations";
import handleDeleteCredential from "@calcom/features/credentials/handleDeleteCredential";
import prisma from "@calcom/prisma";
import type { Credential, EventType, Team, User } from "@calcom/prisma/client";
import { AppCategories, BookingStatus } from "@calcom/prisma/enums";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

describe("handleDeleteCredential Integration Tests - BookingReference Soft Delete", () => {
  let testUser: User;
  let testCredential: Credential;
  let testEventType: EventType;
  const createdBookingReferenceIds: number[] = [];
  const createdBookingIds: number[] = [];

  async function deleteCredentialWithMetadata(credentialId: number, userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });

    return handleDeleteCredential({
      userId,
      userMetadata: user?.metadata ?? {},
      credentialId,
    });
  }

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: "delete-credential-test@example.com",
        username: "delete-credential-test",
      },
    });

    testCredential = await prisma.credential.create({
      data: {
        type: "stripe_payment",
        key: { test_key: "test_value" },
        userId: testUser.id,
        appId: "stripe",
      },
    });

    testEventType = await prisma.eventType.create({
      data: {
        title: "Paid Event",
        slug: "paid-event-test",
        length: 30,
        userId: testUser.id,
        price: 1000, // $10
        currency: "usd",
      },
    });
  });

  afterEach(async () => {
    if (createdBookingReferenceIds.length > 0) {
      await prisma.bookingReference.deleteMany({
        where: {
          id: {
            in: createdBookingReferenceIds,
          },
        },
      });
      createdBookingReferenceIds.splice(0, createdBookingReferenceIds.length);
    }

    if (createdBookingIds.length > 0) {
      await prisma.attendee.deleteMany({
        where: {
          bookingId: {
            in: createdBookingIds,
          },
        },
      });

      await prisma.booking.deleteMany({
        where: {
          id: {
            in: createdBookingIds,
          },
        },
      });
      createdBookingIds.splice(0, createdBookingIds.length);
    }
  });

  afterAll(async () => {
    await prisma.eventType.delete({
      where: {
        id: testEventType.id,
      },
    });

    try {
      await prisma.credential.delete({
        where: {
          id: testCredential.id,
        },
      });
    } catch (error) {
      // Credential already deleted by test
      console.log("Credential deletion error:", error);
    }

    await prisma.user.delete({
      where: {
        id: testUser.id,
      },
    });
  });

  describe("Soft-delete bookingReferences when deleting payment credential", () => {
    it("should soft-delete booking references for unpaid bookings when credential is deleted", async () => {
      const unpaidBooking = await prisma.booking.create({
        data: {
          uid: "unpaid-booking-uid-123",
          title: "Unpaid Booking",
          startTime: new Date(Date.now() + 86400000), // Tomorrow
          endTime: new Date(Date.now() + 90000000),
          userId: testUser.id,
          eventTypeId: testEventType.id,
          status: BookingStatus.PENDING,
          paid: false,
          attendees: {
            create: [
              {
                email: "attendee@test.com",
                name: "Test Attendee",
                timeZone: "America/New_York",
              },
            ],
          },
          payment: {
            create: {
              uid: "payment-uid-123",
              appId: "stripe",
              amount: 1000,
              fee: 0,
              currency: "usd",
              success: false,
              refunded: false,
              data: {},
              externalId: "ext-payment-123",
            },
          },
        },
      });
      createdBookingIds.push(unpaidBooking.id);

      const bookingRef1 = await prisma.bookingReference.create({
        data: {
          type: "stripe_payment",
          uid: "stripe-ref-123",
          meetingId: "stripe-meeting-123",
          credentialId: testCredential.id,
          bookingId: unpaidBooking.id,
        },
      });
      createdBookingReferenceIds.push(bookingRef1.id);

      const bookingRef2 = await prisma.bookingReference.create({
        data: {
          type: "google_calendar",
          uid: "gcal-ref-123",
          meetingId: "gcal-meeting-123",
          credentialId: testCredential.id,
          bookingId: unpaidBooking.id,
        },
      });
      createdBookingReferenceIds.push(bookingRef2.id);

      const refsBeforeDeletion = await prisma.bookingReference.findMany({
        where: {
          bookingId: unpaidBooking.id,
        },
      });
      expect(refsBeforeDeletion).toHaveLength(2);
      expect(refsBeforeDeletion.every((ref) => ref.deleted === null)).toBe(true);

      await deleteCredentialWithMetadata(testCredential.id, testUser.id);

      const refsAfterDeletion = await prisma.bookingReference.findMany({
        where: {
          bookingId: unpaidBooking.id,
        },
      });

      expect(refsAfterDeletion).toHaveLength(2);
      expect(refsAfterDeletion.every((ref) => ref.deleted === true)).toBe(true);

      const cancelledBooking = await prisma.booking.findUnique({
        where: { id: unpaidBooking.id },
      });
      expect(cancelledBooking?.status).toBe(BookingStatus.CANCELLED);
    });

    it("should persist soft-deleted references in database", async () => {
      const newCredential = await prisma.credential.create({
        data: {
          type: "stripe_payment",
          key: { test_key: "test_value" },
          userId: testUser.id,
          appId: "stripe",
        },
      });

      const unpaidBooking = await prisma.booking.create({
        data: {
          uid: "unpaid-booking-uid-456",
          title: "Another Unpaid Booking",
          startTime: new Date(Date.now() + 86400000),
          endTime: new Date(Date.now() + 90000000),
          userId: testUser.id,
          eventTypeId: testEventType.id,
          status: BookingStatus.PENDING,
          paid: false,
          attendees: {
            create: [
              {
                email: "attendee2@test.com",
                name: "Test Attendee 2",
                timeZone: "America/New_York",
              },
            ],
          },
          payment: {
            create: {
              uid: "payment-uid-456",
              appId: "stripe",
              amount: 1000,
              fee: 0,
              currency: "usd",
              success: false,
              refunded: false,
              data: {},
              externalId: "ext-payment-456",
            },
          },
        },
      });
      createdBookingIds.push(unpaidBooking.id);

      const bookingRef = await prisma.bookingReference.create({
        data: {
          type: "stripe_payment",
          uid: "stripe-ref-456",
          meetingId: "stripe-meeting-456",
          meetingUrl: "https://example.com/meeting",
          credentialId: newCredential.id,
          bookingId: unpaidBooking.id,
        },
      });
      createdBookingReferenceIds.push(bookingRef.id);

      await deleteCredentialWithMetadata(newCredential.id, testUser.id);

      const deletedRef = await prisma.bookingReference.findUnique({
        where: { id: bookingRef.id },
      });

      expect(deletedRef).toBeDefined();
      expect(deletedRef?.deleted).toBe(true);
      expect(deletedRef?.uid).toBe("stripe-ref-456");
      expect(deletedRef?.meetingUrl).toBe("https://example.com/meeting");
      expect(deletedRef?.type).toBe("stripe_payment");
    });

    it("should soft-delete references for multiple unpaid bookings when credential is deleted", async () => {
      const newCredential = await prisma.credential.create({
        data: {
          type: "stripe_payment",
          key: { test_key: "test_value" },
          userId: testUser.id,
          appId: "stripe",
        },
      });

      const booking1 = await prisma.booking.create({
        data: {
          uid: "booking-1-uid",
          title: "Booking 1",
          startTime: new Date(Date.now() + 86400000),
          endTime: new Date(Date.now() + 90000000),
          userId: testUser.id,
          eventTypeId: testEventType.id,
          status: BookingStatus.PENDING,
          paid: false,
          attendees: {
            create: [
              {
                email: "attendee-b1@test.com",
                name: "Attendee B1",
                timeZone: "America/New_York",
              },
            ],
          },
          payment: {
            create: {
              uid: "payment-uid-b1",
              appId: "stripe",
              amount: 1000,
              fee: 0,
              currency: "usd",
              success: false,
              refunded: false,
              data: {},
              externalId: "ext-payment-b1",
            },
          },
        },
      });
      createdBookingIds.push(booking1.id);

      const booking2 = await prisma.booking.create({
        data: {
          uid: "booking-2-uid",
          title: "Booking 2",
          startTime: new Date(Date.now() + 172800000), // 2 days from now
          endTime: new Date(Date.now() + 176400000),
          userId: testUser.id,
          eventTypeId: testEventType.id,
          status: BookingStatus.PENDING,
          paid: false,
          attendees: {
            create: [
              {
                email: "attendee-b2@test.com",
                name: "Attendee B2",
                timeZone: "America/New_York",
              },
            ],
          },
          payment: {
            create: {
              uid: "payment-uid-b2",
              appId: "stripe",
              amount: 1000,
              fee: 0,
              currency: "usd",
              success: false,
              refunded: false,
              data: {},
              externalId: "ext-payment-b2",
            },
          },
        },
      });
      createdBookingIds.push(booking2.id);

      const ref1 = await prisma.bookingReference.create({
        data: {
          type: "stripe_payment",
          uid: "stripe-ref-b1",
          meetingId: "meeting-b1",
          credentialId: newCredential.id,
          bookingId: booking1.id,
        },
      });
      createdBookingReferenceIds.push(ref1.id);

      const ref2 = await prisma.bookingReference.create({
        data: {
          type: "stripe_payment",
          uid: "stripe-ref-b2",
          meetingId: "meeting-b2",
          credentialId: newCredential.id,
          bookingId: booking2.id,
        },
      });
      createdBookingReferenceIds.push(ref2.id);

      await deleteCredentialWithMetadata(newCredential.id, testUser.id);

      const allRefsAfter = await prisma.bookingReference.findMany({
        where: {
          id: {
            in: [ref1.id, ref2.id],
          },
        },
      });

      expect(allRefsAfter).toHaveLength(2);
      expect(allRefsAfter.every((ref) => ref.deleted === true)).toBe(true);
    });

    it("should not affect references of paid bookings when credential is deleted", async () => {
      const newCredential = await prisma.credential.create({
        data: {
          type: "stripe_payment",
          key: { test_key: "test_value" },
          userId: testUser.id,
          appId: "stripe",
        },
      });

      const paidBooking = await prisma.booking.create({
        data: {
          uid: "paid-booking-uid",
          title: "Paid Booking",
          startTime: new Date(Date.now() + 86400000),
          endTime: new Date(Date.now() + 90000000),
          userId: testUser.id,
          eventTypeId: testEventType.id,
          status: BookingStatus.ACCEPTED,
          paid: true,
          attendees: {
            create: [
              {
                email: "paid-attendee@test.com",
                name: "Paid Attendee",
                timeZone: "America/New_York",
              },
            ],
          },
        },
      });
      createdBookingIds.push(paidBooking.id);

      const paidBookingRef = await prisma.bookingReference.create({
        data: {
          type: "stripe_payment",
          uid: "stripe-paid-ref",
          meetingId: "stripe-paid-meeting",
          credentialId: newCredential.id,
          bookingId: paidBooking.id,
        },
      });
      createdBookingReferenceIds.push(paidBookingRef.id);

      await deleteCredentialWithMetadata(newCredential.id, testUser.id);

      const refAfter = await prisma.bookingReference.findUnique({
        where: { id: paidBookingRef.id },
      });

      expect(refAfter).toBeDefined();
      expect(refAfter?.deleted).toBe(null);

      const bookingAfter = await prisma.booking.findUnique({
        where: { id: paidBooking.id },
      });
      expect(bookingAfter?.status).toBe(BookingStatus.ACCEPTED);
    });
  });

  describe("Soft-delete behavior with queries after credential deletion", () => {
    it("should exclude soft-deleted references from regular queries", async () => {
      const newCredential = await prisma.credential.create({
        data: {
          type: "stripe_payment",
          key: { test_key: "test_value" },
          userId: testUser.id,
          appId: "stripe",
        },
      });

      const unpaidBooking = await prisma.booking.create({
        data: {
          uid: "query-test-booking-uid",
          title: "Query Test Booking",
          startTime: new Date(Date.now() + 86400000),
          endTime: new Date(Date.now() + 90000000),
          userId: testUser.id,
          eventTypeId: testEventType.id,
          status: BookingStatus.PENDING,
          paid: false,
          attendees: {
            create: [
              {
                email: "query-test@test.com",
                name: "Query Test",
                timeZone: "America/New_York",
              },
            ],
          },
          payment: {
            create: {
              uid: "payment-uid-query-test",
              appId: "stripe",
              amount: 1000,
              fee: 0,
              currency: "usd",
              success: false,
              refunded: false,
              data: {},
              externalId: "ext-payment-query-test",
            },
          },
        },
      });
      createdBookingIds.push(unpaidBooking.id);

      const ref = await prisma.bookingReference.create({
        data: {
          type: "stripe_payment",
          uid: "query-test-ref",
          meetingId: "query-test-meeting",
          credentialId: newCredential.id,
          bookingId: unpaidBooking.id,
        },
      });
      createdBookingReferenceIds.push(ref.id);

      await deleteCredentialWithMetadata(newCredential.id, testUser.id);

      const activeRefs = await prisma.bookingReference.findMany({
        where: {
          bookingId: unpaidBooking.id,
          deleted: null,
        },
      });

      expect(activeRefs).toHaveLength(0);

      const allRefs = await prisma.bookingReference.findMany({
        where: {
          bookingId: unpaidBooking.id,
        },
      });

      expect(allRefs).toHaveLength(1);
      expect(allRefs[0].deleted).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Group: Credential Not Found
// ---------------------------------------------------------------------------
describe("handleDeleteCredential - Credential Not Found", () => {
  let user: User;

  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        email: `hdc-notfound-${Date.now()}@example.com`,
        username: `hdc-notfound-${Date.now()}`,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it("throws when credentialId does not exist", async () => {
    await expect(
      handleDeleteCredential({
        userId: user.id,
        userMetadata: {},
        credentialId: 999999,
      })
    ).rejects.toThrow("Credential not found");
  });

  it("throws when credential belongs to a different user", async () => {
    const otherUser = await prisma.user.create({
      data: {
        email: `hdc-other-${Date.now()}@example.com`,
        username: `hdc-other-${Date.now()}`,
      },
    });

    const cred = await prisma.credential.create({
      data: {
        type: "stripe_payment",
        key: {},
        userId: otherUser.id,
        appId: "stripe",
      },
    });

    try {
      await expect(
        handleDeleteCredential({
          userId: user.id,
          userMetadata: {},
          credentialId: cred.id,
        })
      ).rejects.toThrow("Credential not found");
    } finally {
      await prisma.credential.delete({ where: { id: cred.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: otherUser.id } }).catch(() => {});
    }
  });
});

// ---------------------------------------------------------------------------
// Group: Video App Location Replacement
// ---------------------------------------------------------------------------
describe("handleDeleteCredential - Video App Location Replacement", () => {
  let user: User;
  const createdEventTypeIds: number[] = [];

  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        email: `hdc-video-${Date.now()}@example.com`,
        username: `hdc-video-${Date.now()}`,
      },
    });

    await prisma.app.upsert({
      where: { slug: "zoom" },
      create: {
        slug: "zoom",
        dirName: "zoom",
        categories: [AppCategories.video],
        enabled: true,
      },
      update: {},
    });
  });

  afterEach(async () => {
    for (const id of createdEventTypeIds) {
      await prisma.eventType.delete({ where: { id } }).catch(() => {});
    }
    createdEventTypeIds.splice(0, createdEventTypeIds.length);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it("replaces video app location with DailyLocationType", async () => {
    const cred = await prisma.credential.create({
      data: {
        type: "zoom_video",
        key: {},
        userId: user.id,
        appId: "zoom",
      },
    });

    const eventType = await prisma.eventType.create({
      data: {
        title: "Video Test Event",
        slug: `video-test-${Date.now()}`,
        length: 30,
        userId: user.id,
        locations: [{ type: "integrations:zoom" }],
      },
    });
    createdEventTypeIds.push(eventType.id);

    await handleDeleteCredential({
      userId: user.id,
      userMetadata: {},
      credentialId: cred.id,
    });

    const updated = await prisma.eventType.findUnique({ where: { id: eventType.id } });
    const locations = updated?.locations as { type: string }[];
    expect(locations.some((l) => l.type === DailyLocationType)).toBe(true);
    expect(locations.some((l) => l.type.includes("zoom"))).toBe(false);
  });

  it("does not add duplicate DailyLocationType if already present", async () => {
    const cred = await prisma.credential.create({
      data: {
        type: "zoom_video",
        key: {},
        userId: user.id,
        appId: "zoom",
      },
    });

    const eventType = await prisma.eventType.create({
      data: {
        title: "Video Dup Test",
        slug: `video-dup-${Date.now()}`,
        length: 30,
        userId: user.id,
        locations: [{ type: "integrations:zoom" }, { type: DailyLocationType }],
      },
    });
    createdEventTypeIds.push(eventType.id);

    await handleDeleteCredential({
      userId: user.id,
      userMetadata: {},
      credentialId: cred.id,
    });

    const updated = await prisma.eventType.findUnique({ where: { id: eventType.id } });
    const locations = updated?.locations as { type: string }[];
    const dailyCount = locations.filter((l) => l.type === DailyLocationType).length;
    expect(dailyCount).toBe(1);
  });

  it("preserves non-video locations while replacing video ones", async () => {
    const cred = await prisma.credential.create({
      data: {
        type: "zoom_video",
        key: {},
        userId: user.id,
        appId: "zoom",
      },
    });

    const eventType = await prisma.eventType.create({
      data: {
        title: "Mixed Location Test",
        slug: `mixed-loc-${Date.now()}`,
        length: 30,
        userId: user.id,
        locations: [{ type: "integrations:zoom" }, { type: "inPerson" }, { type: "phone" }],
      },
    });
    createdEventTypeIds.push(eventType.id);

    await handleDeleteCredential({
      userId: user.id,
      userMetadata: {},
      credentialId: cred.id,
    });

    const updated = await prisma.eventType.findUnique({ where: { id: eventType.id } });
    const locations = updated?.locations as { type: string }[];
    expect(locations).toHaveLength(3);
    expect(locations.some((l) => l.type === DailyLocationType)).toBe(true);
    expect(locations.some((l) => l.type === "inPerson")).toBe(true);
    expect(locations.some((l) => l.type === "phone")).toBe(true);
    expect(locations.some((l) => l.type.includes("zoom"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Group: CRM App Credential Deletion
// ---------------------------------------------------------------------------
describe("handleDeleteCredential - CRM App", () => {
  let user: User;
  const createdEventTypeIds: number[] = [];

  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        email: `hdc-crm-${Date.now()}@example.com`,
        username: `hdc-crm-${Date.now()}`,
      },
    });

    await prisma.app.upsert({
      where: { slug: "salesforce" },
      create: {
        slug: "salesforce",
        dirName: "salesforce",
        categories: [AppCategories.crm],
        enabled: true,
      },
      update: {},
    });
  });

  afterEach(async () => {
    for (const id of createdEventTypeIds) {
      await prisma.eventType.delete({ where: { id } }).catch(() => {});
    }
    createdEventTypeIds.splice(0, createdEventTypeIds.length);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it("hides event type and removes CRM app from metadata", async () => {
    const cred = await prisma.credential.create({
      data: {
        type: "salesforce_crm",
        key: {},
        userId: user.id,
        appId: "salesforce",
      },
    });

    const eventType = await prisma.eventType.create({
      data: {
        title: "CRM Event",
        slug: `crm-test-${Date.now()}`,
        length: 30,
        userId: user.id,
        metadata: {
          apps: {
            salesforce: { enabled: true, credentialId: cred.id, appCategories: ["crm"] },
            googlecalendar: { enabled: true, credentialId: 999, appCategories: ["calendar"] },
          },
        },
      },
    });
    createdEventTypeIds.push(eventType.id);

    await handleDeleteCredential({
      userId: user.id,
      userMetadata: {},
      credentialId: cred.id,
    });

    const updated = await prisma.eventType.findUnique({ where: { id: eventType.id } });
    expect(updated?.hidden).toBe(true);

    const metadata = updated?.metadata as Record<string, unknown> | null;
    const apps = (metadata?.apps ?? {}) as Record<string, unknown>;
    expect(apps["salesforce"]).toBeUndefined();
    expect(apps["googlecalendar"]).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Group: Zapier / Make Cleanup
// ---------------------------------------------------------------------------
describe("handleDeleteCredential - Zapier/Make Cleanup", () => {
  let user: User;

  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        email: `hdc-zapier-${Date.now()}@example.com`,
        username: `hdc-zapier-${Date.now()}`,
      },
    });

    await prisma.app.upsert({
      where: { slug: "zapier" },
      create: {
        slug: "zapier",
        dirName: "zapier",
        categories: [AppCategories.automation],
        enabled: true,
      },
      update: {},
    });

    await prisma.app.upsert({
      where: { slug: "make" },
      create: {
        slug: "make",
        dirName: "make",
        categories: [AppCategories.automation],
        enabled: true,
      },
      update: {},
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it("deletes API keys and webhooks when zapier credential is removed", async () => {
    const cred = await prisma.credential.create({
      data: {
        type: "zapier_automation",
        key: {},
        userId: user.id,
        appId: "zapier",
      },
    });

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        appId: "zapier",
        hashedKey: `zapier-hashed-${Date.now()}`,
      },
    });

    const webhook = await prisma.webhook.create({
      data: {
        id: `zapier-wh-${Date.now()}`,
        userId: user.id,
        appId: "zapier",
        subscriberUrl: "https://hooks.zapier.com/test",
        eventTriggers: [],
      },
    });

    await handleDeleteCredential({
      userId: user.id,
      userMetadata: {},
      credentialId: cred.id,
    });

    const remainingKeys = await prisma.apiKey.findMany({
      where: { userId: user.id, appId: "zapier" },
    });
    expect(remainingKeys).toHaveLength(0);

    const remainingWebhooks = await prisma.webhook.findMany({
      where: { userId: user.id, appId: "zapier" },
    });
    expect(remainingWebhooks).toHaveLength(0);
  });

  it("deletes API keys and webhooks when make credential is removed", async () => {
    const cred = await prisma.credential.create({
      data: {
        type: "make_automation",
        key: {},
        userId: user.id,
        appId: "make",
      },
    });

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        appId: "make",
        hashedKey: `make-hashed-${Date.now()}`,
      },
    });

    const webhook = await prisma.webhook.create({
      data: {
        id: `make-wh-${Date.now()}`,
        userId: user.id,
        appId: "make",
        subscriberUrl: "https://hooks.make.com/test",
        eventTriggers: [],
      },
    });

    await handleDeleteCredential({
      userId: user.id,
      userMetadata: {},
      credentialId: cred.id,
    });

    const remainingKeys = await prisma.apiKey.findMany({
      where: { userId: user.id, appId: "make" },
    });
    expect(remainingKeys).toHaveLength(0);

    const remainingWebhooks = await prisma.webhook.findMany({
      where: { userId: user.id, appId: "make" },
    });
    expect(remainingWebhooks).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Group: Default Conferencing App
// ---------------------------------------------------------------------------
describe("handleDeleteCredential - Default Conferencing App", () => {
  let user: User;

  beforeAll(async () => {
    await prisma.app.upsert({
      where: { slug: "daily-video" },
      create: {
        slug: "daily-video",
        dirName: "dailyvideo",
        categories: [AppCategories.conferencing],
        enabled: true,
      },
      update: {},
    });
  });

  beforeEach(async () => {
    user = await prisma.user.create({
      data: {
        email: `hdc-conf-${Date.now()}@example.com`,
        username: `hdc-conf-${Date.now()}`,
      },
    });
  });

  afterEach(async () => {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it("clears default conferencing app from user metadata when it matches", async () => {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        metadata: {
          defaultConferencingApp: { appSlug: "daily-video", appLink: "https://cal.com" },
        },
      },
    });

    const cred = await prisma.credential.create({
      data: {
        type: "daily_video",
        key: {},
        userId: user.id,
        appId: "daily-video",
      },
    });

    const userBefore = await prisma.user.findUnique({
      where: { id: user.id },
      select: { metadata: true },
    });

    await handleDeleteCredential({
      userId: user.id,
      userMetadata: userBefore?.metadata ?? {},
      credentialId: cred.id,
    });

    const userAfter = await prisma.user.findUnique({
      where: { id: user.id },
      select: { metadata: true },
    });

    const meta = userAfter?.metadata as Record<string, unknown> | null;
    expect(meta?.defaultConferencingApp).toBeUndefined();
  });

  it("does not modify user metadata when a different app is the default", async () => {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        metadata: {
          defaultConferencingApp: { appSlug: "zoom", appLink: "https://zoom.us" },
        },
      },
    });

    const cred = await prisma.credential.create({
      data: {
        type: "daily_video",
        key: {},
        userId: user.id,
        appId: "daily-video",
      },
    });

    const userBefore = await prisma.user.findUnique({
      where: { id: user.id },
      select: { metadata: true },
    });

    await handleDeleteCredential({
      userId: user.id,
      userMetadata: userBefore?.metadata ?? {},
      credentialId: cred.id,
    });

    const userAfter = await prisma.user.findUnique({
      where: { id: user.id },
      select: { metadata: true },
    });

    const meta = userAfter?.metadata as Record<string, unknown> | null;
    const confApp = meta?.defaultConferencingApp as Record<string, unknown> | undefined;
    expect(confApp?.appSlug).toBe("zoom");
  });
});

// ---------------------------------------------------------------------------
// Group: Calendar App - Destination Calendar
// ---------------------------------------------------------------------------
describe("handleDeleteCredential - Calendar Destination Calendar", () => {
  let user: User;
  const createdEventTypeIds: number[] = [];

  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        email: `hdc-cal-${Date.now()}@example.com`,
        username: `hdc-cal-${Date.now()}`,
      },
    });

    await prisma.app.upsert({
      where: { slug: "google-calendar" },
      create: {
        slug: "google-calendar",
        dirName: "googlecalendar",
        categories: [AppCategories.calendar],
        enabled: true,
      },
      update: {},
    });
  });

  afterEach(async () => {
    for (const id of createdEventTypeIds) {
      // Clean up destination calendar first due to relation
      await prisma.destinationCalendar.deleteMany({ where: { eventTypeId: id } }).catch(() => {});
      await prisma.eventType.delete({ where: { id } }).catch(() => {});
    }
    createdEventTypeIds.splice(0, createdEventTypeIds.length);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it("deletes destination calendar when calendar credential is removed", async () => {
    const cred = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: { access_token: "test", refresh_token: "test" },
        userId: user.id,
        appId: "google-calendar",
      },
    });

    const eventType = await prisma.eventType.create({
      data: {
        title: "Calendar Test Event",
        slug: `cal-test-${Date.now()}`,
        length: 30,
        userId: user.id,
        destinationCalendar: {
          create: {
            integration: "google_calendar",
            externalId: "test-external-id@group.calendar.google.com",
            credentialId: cred.id,
          },
        },
      },
    });
    createdEventTypeIds.push(eventType.id);

    // Verify destination calendar exists
    const destCalBefore = await prisma.destinationCalendar.findUnique({
      where: { eventTypeId: eventType.id },
    });
    expect(destCalBefore).toBeDefined();

    await handleDeleteCredential({
      userId: user.id,
      userMetadata: {},
      credentialId: cred.id,
    });

    // Destination calendar should be deleted
    const destCalAfter = await prisma.destinationCalendar.findUnique({
      where: { eventTypeId: eventType.id },
    });
    expect(destCalAfter).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Group: Simple Credential Deletion & Edge Cases
// ---------------------------------------------------------------------------
describe("handleDeleteCredential - Credential Deletion & Edge Cases", () => {
  let user: User;

  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        email: `hdc-simple-${Date.now()}@example.com`,
        username: `hdc-simple-${Date.now()}`,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it("deletes the credential record at the end", async () => {
    const cred = await prisma.credential.create({
      data: {
        type: "stripe_payment",
        key: {},
        userId: user.id,
        appId: "stripe",
      },
    });

    await handleDeleteCredential({
      userId: user.id,
      userMetadata: {},
      credentialId: cred.id,
    });

    const deleted = await prisma.credential.findUnique({ where: { id: cred.id } });
    expect(deleted).toBeNull();
  });

  it("handles user with no event types gracefully", async () => {
    const cred = await prisma.credential.create({
      data: {
        type: "stripe_payment",
        key: {},
        userId: user.id,
        appId: "stripe",
      },
    });

    // No event types created for this user
    await expect(
      handleDeleteCredential({
        userId: user.id,
        userMetadata: {},
        credentialId: cred.id,
      })
    ).resolves.toBeUndefined();

    const deleted = await prisma.credential.findUnique({ where: { id: cred.id } });
    expect(deleted).toBeNull();
  });

  it("processes all event types belonging to the user", async () => {
    await prisma.app.upsert({
      where: { slug: "zoom" },
      create: {
        slug: "zoom",
        dirName: "zoom",
        categories: [AppCategories.video],
        enabled: true,
      },
      update: {},
    });

    const cred = await prisma.credential.create({
      data: {
        type: "zoom_video",
        key: {},
        userId: user.id,
        appId: "zoom",
      },
    });

    const et1 = await prisma.eventType.create({
      data: {
        title: "Multi ET 1",
        slug: `multi-et1-${Date.now()}`,
        length: 30,
        userId: user.id,
        locations: [{ type: "integrations:zoom" }],
      },
    });

    const et2 = await prisma.eventType.create({
      data: {
        title: "Multi ET 2",
        slug: `multi-et2-${Date.now()}`,
        length: 60,
        userId: user.id,
        locations: [{ type: "integrations:zoom" }, { type: "phone" }],
      },
    });

    await handleDeleteCredential({
      userId: user.id,
      userMetadata: {},
      credentialId: cred.id,
    });

    const updated1 = await prisma.eventType.findUnique({ where: { id: et1.id } });
    const updated2 = await prisma.eventType.findUnique({ where: { id: et2.id } });

    const locs1 = updated1?.locations as { type: string }[];
    const locs2 = updated2?.locations as { type: string }[];

    expect(locs1.some((l) => l.type === DailyLocationType)).toBe(true);
    expect(locs1.some((l) => l.type.includes("zoom"))).toBe(false);

    expect(locs2.some((l) => l.type === DailyLocationType)).toBe(true);
    expect(locs2.some((l) => l.type === "phone")).toBe(true);
    expect(locs2.some((l) => l.type.includes("zoom"))).toBe(false);

    // Cleanup
    await prisma.eventType.delete({ where: { id: et1.id } }).catch(() => {});
    await prisma.eventType.delete({ where: { id: et2.id } }).catch(() => {});
  });
});

// ---------------------------------------------------------------------------
// Group: Team Credential Handling
// ---------------------------------------------------------------------------
describe("handleDeleteCredential - Team Credential", () => {
  let user: User;
  let team: Team;

  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        email: `hdc-team-${Date.now()}@example.com`,
        username: `hdc-team-${Date.now()}`,
      },
    });

    team = await prisma.team.create({
      data: {
        name: `HDC Test Team ${Date.now()}`,
        slug: `hdc-team-${Date.now()}`,
      },
    });
  });

  afterAll(async () => {
    await prisma.team.delete({ where: { id: team.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  });

  it("deletes a team credential using teamId parameter", async () => {
    const cred = await prisma.credential.create({
      data: {
        type: "stripe_payment",
        key: {},
        teamId: team.id,
        appId: "stripe",
      },
    });

    await handleDeleteCredential({
      userId: user.id,
      userMetadata: {},
      credentialId: cred.id,
      teamId: team.id,
    });

    const deleted = await prisma.credential.findUnique({ where: { id: cred.id } });
    expect(deleted).toBeNull();
  });

  it("throws when teamId does not match the credential", async () => {
    const otherTeam = await prisma.team.create({
      data: {
        name: `HDC Other Team ${Date.now()}`,
        slug: `hdc-other-team-${Date.now()}`,
      },
    });

    const cred = await prisma.credential.create({
      data: {
        type: "stripe_payment",
        key: {},
        teamId: team.id,
        appId: "stripe",
      },
    });

    try {
      await expect(
        handleDeleteCredential({
          userId: user.id,
          userMetadata: {},
          credentialId: cred.id,
          teamId: otherTeam.id,
        })
      ).rejects.toThrow("Credential not found");
    } finally {
      await prisma.credential.delete({ where: { id: cred.id } }).catch(() => {});
      await prisma.team.delete({ where: { id: otherTeam.id } }).catch(() => {});
    }
  });
});
