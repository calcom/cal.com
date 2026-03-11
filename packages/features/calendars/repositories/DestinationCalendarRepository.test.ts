import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockBuildCredentialPayload } = vi.hoisted(() => ({
  mockPrisma: {
    destinationCalendar: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
  mockBuildCredentialPayload: vi.fn().mockReturnValue({}),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@calcom/lib/server/buildCredentialPayloadForCalendar", () => ({
  buildCredentialPayloadForPrisma: mockBuildCredentialPayload,
}));

import { DestinationCalendarRepository } from "./DestinationCalendarRepository";

describe("DestinationCalendarRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("instance methods", () => {
    describe("fn: getCustomReminderByCredentialId", () => {
      it("should return custom reminder value when found", async () => {
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue({
          customCalendarReminder: 15,
        });

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.getCustomReminderByCredentialId(1);

        expect(result).toBe(15);
        expect(mockPrisma.destinationCalendar.findFirst).toHaveBeenCalledWith({
          where: { credentialId: 1 },
          select: { customCalendarReminder: true },
        });
      });

      it("should return null when no destination calendar found", async () => {
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(null);

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.getCustomReminderByCredentialId(999);

        expect(result).toBeNull();
      });

      it("should return null when customCalendarReminder is null", async () => {
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue({
          customCalendarReminder: null,
        });

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.getCustomReminderByCredentialId(1);

        expect(result).toBeNull();
      });
    });

    describe("fn: updateCustomReminder", () => {
      it("should update custom reminder for given user and credential", async () => {
        mockPrisma.destinationCalendar.updateMany.mockResolvedValue({ count: 1 });

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        const result = await repo.updateCustomReminder({
          userId: 1,
          credentialId: 2,
          integration: "google_calendar",
          customCalendarReminder: 30,
        });

        expect(result).toEqual({ count: 1 });
        expect(mockPrisma.destinationCalendar.updateMany).toHaveBeenCalledWith({
          where: { userId: 1, credentialId: 2, integration: "google_calendar" },
          data: { customCalendarReminder: 30 },
        });
      });

      it("should set custom reminder to null", async () => {
        mockPrisma.destinationCalendar.updateMany.mockResolvedValue({ count: 1 });

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        await repo.updateCustomReminder({
          userId: 1,
          credentialId: 2,
          integration: "google_calendar",
          customCalendarReminder: null,
        });

        expect(mockPrisma.destinationCalendar.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { customCalendarReminder: null },
          })
        );
      });
    });

    describe("fn: upsert", () => {
      it("should upsert with credential payload for both create and update", async () => {
        mockBuildCredentialPayload
          .mockReturnValueOnce({ credentialId: 5 })
          .mockReturnValueOnce({ credentialId: 5 });
        mockPrisma.destinationCalendar.upsert.mockResolvedValue({ id: 1 });

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        await repo.upsert({
          where: { id: 1 },
          update: {
            integration: "google_calendar",
            externalId: "updated-cal",
            credentialId: 5,
          },
          create: {
            integration: "google_calendar",
            externalId: "new-cal",
            credentialId: 5,
          },
        });

        expect(mockBuildCredentialPayload).toHaveBeenCalledTimes(2);
        expect(mockPrisma.destinationCalendar.upsert).toHaveBeenCalledWith({
          where: { id: 1 },
          update: expect.objectContaining({ integration: "google_calendar", externalId: "updated-cal" }),
          create: expect.objectContaining({ integration: "google_calendar", externalId: "new-cal" }),
        });
      });

      it("should handle delegation credential in upsert", async () => {
        mockBuildCredentialPayload
          .mockReturnValueOnce({ delegationCredentialId: "del-123" })
          .mockReturnValueOnce({ delegationCredentialId: "del-123" });
        mockPrisma.destinationCalendar.upsert.mockResolvedValue({ id: 2 });

        const repo = new DestinationCalendarRepository(mockPrisma as never);
        await repo.upsert({
          where: { id: 2 },
          update: {
            integration: "google_calendar",
            externalId: "cal-1",
            credentialId: null,
            delegationCredentialId: "del-123",
          },
          create: {
            integration: "google_calendar",
            externalId: "cal-1",
            credentialId: null,
            delegationCredentialId: "del-123",
          },
        });

        expect(mockBuildCredentialPayload).toHaveBeenNthCalledWith(1, {
          credentialId: null,
          delegationCredentialId: "del-123",
        });
        expect(mockBuildCredentialPayload).toHaveBeenNthCalledWith(2, {
          credentialId: null,
          delegationCredentialId: "del-123",
        });
      });
    });
  });

  describe("static methods", () => {
    describe("fn: create", () => {
      it("should create a destination calendar", async () => {
        const data = {
          integration: "google_calendar",
          externalId: "cal-123",
        };
        mockPrisma.destinationCalendar.create.mockResolvedValue({ id: 1, ...data });

        const result = await DestinationCalendarRepository.create(data as never);

        expect(result).toEqual({ id: 1, ...data });
        expect(mockPrisma.destinationCalendar.create).toHaveBeenCalledWith({ data });
      });
    });

    describe("fn: createIfNotExistsForUser", () => {
      it("should return existing calendar if one with same user/integration/externalId exists", async () => {
        const existing = {
          id: 5,
          userId: 1,
          integration: "google_calendar",
          externalId: "cal-123",
        };
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(existing);

        const result = await DestinationCalendarRepository.createIfNotExistsForUser({
          userId: 1,
          integration: "google_calendar",
          externalId: "cal-123",
        } as never);

        expect(result).toEqual(existing);
        expect(mockPrisma.destinationCalendar.create).not.toHaveBeenCalled();
      });

      it("should create a new calendar when no conflicting one exists", async () => {
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(null);
        const newCal = { id: 10, userId: 1, integration: "google_calendar", externalId: "new-cal" };
        mockPrisma.destinationCalendar.create.mockResolvedValue(newCal);

        const data = { userId: 1, integration: "google_calendar", externalId: "new-cal" };
        const result = await DestinationCalendarRepository.createIfNotExistsForUser(data as never);

        expect(result).toEqual(newCal);
        expect(mockPrisma.destinationCalendar.create).toHaveBeenCalledWith({ data });
      });
    });

    describe("fn: getByUserId", () => {
      it("should find destination calendar by userId", async () => {
        const cal = { id: 1, userId: 5, integration: "google_calendar" };
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(cal);

        const result = await DestinationCalendarRepository.getByUserId(5);

        expect(result).toEqual(cal);
        expect(mockPrisma.destinationCalendar.findFirst).toHaveBeenCalledWith({
          where: { userId: 5 },
        });
      });

      it("should return null when no calendar exists for user", async () => {
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(null);

        const result = await DestinationCalendarRepository.getByUserId(999);

        expect(result).toBeNull();
      });
    });

    describe("fn: getByEventTypeId", () => {
      it("should find destination calendar by eventTypeId", async () => {
        const cal = { id: 2, eventTypeId: 10, integration: "office365_calendar" };
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(cal);

        const result = await DestinationCalendarRepository.getByEventTypeId(10);

        expect(result).toEqual(cal);
        expect(mockPrisma.destinationCalendar.findFirst).toHaveBeenCalledWith({
          where: { eventTypeId: 10 },
        });
      });
    });

    describe("fn: find", () => {
      it("should find destination calendar with custom where clause", async () => {
        const cal = { id: 3, integration: "google_calendar" };
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(cal);

        const result = await DestinationCalendarRepository.find({
          where: { integration: "google_calendar", userId: 1 },
        });

        expect(result).toEqual(cal);
        expect(mockPrisma.destinationCalendar.findFirst).toHaveBeenCalledWith({
          where: { integration: "google_calendar", userId: 1 },
        });
      });

      it("should return null when no match found", async () => {
        mockPrisma.destinationCalendar.findFirst.mockResolvedValue(null);

        const result = await DestinationCalendarRepository.find({
          where: { userId: 999 },
        });

        expect(result).toBeNull();
      });
    });

  });
});
