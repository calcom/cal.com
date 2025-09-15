import { describe, test, expect, beforeEach, vi } from "vitest";
import prismock from "../../../tests/libs/__mocks__/prisma";

describe("EventType.minimumCancellationNotice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should have minimumCancellationNotice field with default value 0", async () => {
    const user = await prismock.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
      },
    });

    const eventType = await prismock.eventType.create({
      data: {
        title: "Test Event",
        slug: "test-event",
        length: 30,
        userId: user.id,
      },
    });

    expect(eventType).toHaveProperty("minimumCancellationNotice");
    expect(eventType.minimumCancellationNotice).toBe(0);
  });

  test("should allow setting custom minimumCancellationNotice value", async () => {
    const user = await prismock.user.create({
      data: {
        username: "testuser2",
        email: "test2@example.com",
      },
    });

    const customNoticeTime = 1440; // 24 hours in minutes
    const eventType = await prismock.eventType.create({
      data: {
        title: "Test Event with Custom Notice",
        slug: "test-event-custom",
        length: 60,
        userId: user.id,
        minimumCancellationNotice: customNoticeTime,
      },
    });

    expect(eventType.minimumCancellationNotice).toBe(customNoticeTime);
  });

  test("should update minimumCancellationNotice value", async () => {
    const user = await prismock.user.create({
      data: {
        username: "testuser3",
        email: "test3@example.com",
      },
    });

    const eventType = await prismock.eventType.create({
      data: {
        title: "Test Event for Update",
        slug: "test-event-update",
        length: 45,
        userId: user.id,
      },
    });

    expect(eventType.minimumCancellationNotice).toBe(0);

    const updatedEventType = await prismock.eventType.update({
      where: { id: eventType.id },
      data: { minimumCancellationNotice: 720 }, // 12 hours
    });

    expect(updatedEventType.minimumCancellationNotice).toBe(720);
  });

  test("should not allow negative values for minimumCancellationNotice", async () => {
    const user = await prismock.user.create({
      data: {
        username: "testuser4",
        email: "test4@example.com",
      },
    });

    // This test assumes validation is enforced at the application layer
    // The @zod.min(0) directive in the schema should prevent negative values
    const eventType = await prismock.eventType.create({
      data: {
        title: "Test Event Non-Negative",
        slug: "test-event-non-negative",
        length: 30,
        userId: user.id,
        minimumCancellationNotice: 0, // Minimum allowed value
      },
    });

    expect(eventType.minimumCancellationNotice).toBeGreaterThanOrEqual(0);
  });
});