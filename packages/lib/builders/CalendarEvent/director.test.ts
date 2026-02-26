import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: vi.fn(() => "{}"),
}));

import { CalendarEventDirector } from "./director";

function createMockBuilder() {
  return {
    buildEventObjectFromInnerClass: vi.fn().mockResolvedValue(undefined),
    buildUsersFromInnerClass: vi.fn().mockResolvedValue(undefined),
    buildAttendeesList: vi.fn(),
    setLocation: vi.fn(),
    setUId: vi.fn(),
    setCancellationReason: vi.fn(),
    setDescription: vi.fn(),
    setNotes: vi.fn(),
    buildRescheduleLink: vi.fn(),
    setUsersFromId: vi.fn().mockResolvedValue(undefined),
    eventType: { description: "Event description" },
  };
}

describe("CalendarEventDirector", () => {
  let director: CalendarEventDirector;

  beforeEach(() => {
    director = new CalendarEventDirector();
  });

  describe("buildForRescheduleEmail", () => {
    it("calls all builder methods in correct order when booking has required fields", async () => {
      const builder = createMockBuilder();
      director.setBuilder(builder as never);
      director.setExistingBooking({
        id: 1,
        uid: "uid-123",
        title: "Test",
        startTime: new Date(),
        endTime: new Date(),
        eventTypeId: 10,
        userId: 5,
        dynamicEventSlugRef: null,
        dynamicGroupSlugRef: null,
        location: "https://meet.example.com",
      });
      director.setCancellationReason("scheduling conflict");

      await director.buildForRescheduleEmail();

      expect(builder.buildEventObjectFromInnerClass).toHaveBeenCalledWith(10);
      expect(builder.buildUsersFromInnerClass).toHaveBeenCalled();
      expect(builder.buildAttendeesList).toHaveBeenCalled();
      expect(builder.setLocation).toHaveBeenCalledWith("https://meet.example.com");
      expect(builder.setUId).toHaveBeenCalledWith("uid-123");
      expect(builder.setCancellationReason).toHaveBeenCalledWith("scheduling conflict");
      expect(builder.setDescription).toHaveBeenCalledWith("Event description");
      expect(builder.buildRescheduleLink).toHaveBeenCalledWith({ allowRescheduleForCancelledBooking: false });
    });

    it("passes allowRescheduleForCancelledBooking option through", async () => {
      const builder = createMockBuilder();
      director.setBuilder(builder as never);
      director.setExistingBooking({
        id: 1,
        uid: "uid-123",
        title: "Test",
        startTime: new Date(),
        endTime: new Date(),
        eventTypeId: 10,
        userId: 5,
        dynamicEventSlugRef: null,
        dynamicGroupSlugRef: null,
        location: null,
      });

      await director.buildForRescheduleEmail({ allowRescheduleForCancelledBooking: true });

      expect(builder.buildRescheduleLink).toHaveBeenCalledWith({ allowRescheduleForCancelledBooking: true });
    });

    it("throws when existingBooking is missing required fields", async () => {
      const builder = createMockBuilder();
      director.setBuilder(builder as never);
      // No booking set → should throw
      director.setExistingBooking({
        id: 1,
        uid: "",
        title: "Test",
        startTime: new Date(),
        endTime: new Date(),
        eventTypeId: null,
        userId: 5,
        dynamicEventSlugRef: null,
        dynamicGroupSlugRef: null,
        location: null,
      });

      await expect(director.buildForRescheduleEmail()).rejects.toThrow(
        "buildForRescheduleEmail.missing.params.required"
      );
    });
  });

  describe("buildWithoutEventTypeForRescheduleEmail", () => {
    it("calls builder methods with userId instead of eventTypeId", async () => {
      const builder = createMockBuilder();
      director.setBuilder(builder as never);
      director.setExistingBooking({
        id: 1,
        uid: "uid-456",
        title: "Test",
        startTime: new Date(),
        endTime: new Date(),
        eventTypeId: null,
        userId: 42,
        dynamicEventSlugRef: null,
        dynamicGroupSlugRef: null,
        location: "Office",
      });
      director.setCancellationReason("no longer needed");

      await director.buildWithoutEventTypeForRescheduleEmail();

      expect(builder.setUsersFromId).toHaveBeenCalledWith(42);
      expect(builder.buildAttendeesList).toHaveBeenCalled();
      expect(builder.setLocation).toHaveBeenCalledWith("Office");
      expect(builder.setUId).toHaveBeenCalledWith("uid-456");
      expect(builder.setCancellationReason).toHaveBeenCalledWith("no longer needed");
      expect(builder.buildRescheduleLink).toHaveBeenCalled();
    });

    it("throws when userId is missing", async () => {
      const builder = createMockBuilder();
      director.setBuilder(builder as never);
      director.setExistingBooking({
        id: 1,
        uid: "uid-789",
        title: "Test",
        startTime: new Date(),
        endTime: new Date(),
        eventTypeId: null,
        userId: null,
        dynamicEventSlugRef: null,
        dynamicGroupSlugRef: null,
        location: null,
      });

      await expect(director.buildWithoutEventTypeForRescheduleEmail()).rejects.toThrow(
        "buildWithoutEventTypeForRescheduleEmail.missing.params.required"
      );
    });

    it("throws when uid is missing", async () => {
      const builder = createMockBuilder();
      director.setBuilder(builder as never);
      director.setExistingBooking({
        id: 1,
        uid: "",
        title: "Test",
        startTime: new Date(),
        endTime: new Date(),
        eventTypeId: null,
        userId: 42,
        dynamicEventSlugRef: null,
        dynamicGroupSlugRef: null,
        location: null,
      });

      await expect(director.buildWithoutEventTypeForRescheduleEmail()).rejects.toThrow(
        "buildWithoutEventTypeForRescheduleEmail.missing.params.required"
      );
    });
  });
});
