import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach, vi } from "vitest";

import { SelectedCalendarRepository } from "./selectedCalendar";

const mockCalendarService = {
  listCalendars: vi.fn(),
};

vi.mock("@calcom/app-store/_utils/getCalendar", () => ({
  getCalendar: vi.fn(() => Promise.resolve(mockCalendarService)),
}));

describe("SelectedCalendarRepository - Sync Operations", () => {
  beforeEach(() => {
    prismock.selectedCalendar.deleteMany();
    vi.clearAllMocks();
  });

  describe("findOrphanedCalendars", () => {
    it("should find calendars that are not in the valid external IDs list", async () => {
      const credentialId = 1;

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar1@gmail.com",
        credentialId,
      });

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar2@gmail.com",
        credentialId,
      });

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar3@gmail.com",
        credentialId,
      });

      const validExternalIds = ["calendar1@gmail.com", "calendar3@gmail.com"];
      const orphanedCalendars = await SelectedCalendarRepository.findOrphanedCalendars({
        credentialId,
        validExternalIds,
      });

      expect(orphanedCalendars).toHaveLength(1);
      expect(orphanedCalendars[0].externalId).toBe("calendar2@gmail.com");
    });

    it("should return empty array when all calendars are valid", async () => {
      const credentialId = 1;

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar1@gmail.com",
        credentialId,
      });

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar2@gmail.com",
        credentialId,
      });

      const validExternalIds = ["calendar1@gmail.com", "calendar2@gmail.com"];
      const orphanedCalendars = await SelectedCalendarRepository.findOrphanedCalendars({
        credentialId,
        validExternalIds,
      });

      expect(orphanedCalendars).toHaveLength(0);
    });

    it("should only find orphaned calendars for the specified credential", async () => {
      const credentialId1 = 1;
      const credentialId2 = 2;

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar1@gmail.com",
        credentialId: credentialId1,
      });

      await SelectedCalendarRepository.create({
        userId: 2,
        integration: "google_calendar",
        externalId: "calendar1@gmail.com",
        credentialId: credentialId2,
      });

      const validExternalIds: string[] = [];
      const orphanedCalendars = await SelectedCalendarRepository.findOrphanedCalendars({
        credentialId: credentialId1,
        validExternalIds,
      });

      expect(orphanedCalendars).toHaveLength(1);
      expect(orphanedCalendars[0].credentialId).toBe(credentialId1);
    });
  });

  describe("deleteOrphanedCalendars", () => {
    it("should delete calendars that are not in the valid external IDs list", async () => {
      const credentialId = 1;

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar1@gmail.com",
        credentialId,
      });

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar2@gmail.com",
        credentialId,
      });

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar3@gmail.com",
        credentialId,
      });

      const validExternalIds = ["calendar1@gmail.com", "calendar3@gmail.com"];
      const result = await SelectedCalendarRepository.deleteOrphanedCalendars({
        credentialId,
        validExternalIds,
      });

      expect(result.count).toBe(1);

      const remainingCalendars = await SelectedCalendarRepository.findMany({
        where: { credentialId },
      });
      expect(remainingCalendars).toHaveLength(2);
      expect(remainingCalendars.map((cal) => cal.externalId)).toEqual(
        expect.arrayContaining(["calendar1@gmail.com", "calendar3@gmail.com"])
      );
    });

    it("should not delete any calendars when all are valid", async () => {
      const credentialId = 1;

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar1@gmail.com",
        credentialId,
      });

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar2@gmail.com",
        credentialId,
      });

      const validExternalIds = ["calendar1@gmail.com", "calendar2@gmail.com"];
      const result = await SelectedCalendarRepository.deleteOrphanedCalendars({
        credentialId,
        validExternalIds,
      });

      expect(result.count).toBe(0);

      const remainingCalendars = await SelectedCalendarRepository.findMany({
        where: { credentialId },
      });
      expect(remainingCalendars).toHaveLength(2);
    });

    it("should only delete orphaned calendars for the specified credential", async () => {
      const credentialId1 = 1;
      const credentialId2 = 2;

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar1@gmail.com",
        credentialId: credentialId1,
      });

      await SelectedCalendarRepository.create({
        userId: 2,
        integration: "google_calendar",
        externalId: "calendar1@gmail.com",
        credentialId: credentialId2,
      });

      const validExternalIds: string[] = [];
      const result = await SelectedCalendarRepository.deleteOrphanedCalendars({
        credentialId: credentialId1,
        validExternalIds,
      });

      expect(result.count).toBe(1);

      const remainingCalendars = await SelectedCalendarRepository.findMany({
        where: {},
      });
      expect(remainingCalendars).toHaveLength(1);
      expect(remainingCalendars[0].credentialId).toBe(credentialId2);
    });
  });

  describe("Calendar sync integration scenarios", () => {
    it("should handle mixed scenarios with multiple calendar providers", async () => {
      const googleCredentialId = 1;
      const office365CredentialId = 2;

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "google1@gmail.com",
        credentialId: googleCredentialId,
      });

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "google2@gmail.com",
        credentialId: googleCredentialId,
      });

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "office365_calendar",
        externalId: "office1@outlook.com",
        credentialId: office365CredentialId,
      });

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "office365_calendar",
        externalId: "office2@outlook.com",
        credentialId: office365CredentialId,
      });

      const googleValidIds = ["google1@gmail.com"];
      const office365ValidIds = ["office1@outlook.com"];

      const googleOrphaned = await SelectedCalendarRepository.findOrphanedCalendars({
        credentialId: googleCredentialId,
        validExternalIds: googleValidIds,
      });

      const office365Orphaned = await SelectedCalendarRepository.findOrphanedCalendars({
        credentialId: office365CredentialId,
        validExternalIds: office365ValidIds,
      });

      expect(googleOrphaned).toHaveLength(1);
      expect(googleOrphaned[0].externalId).toBe("google2@gmail.com");

      expect(office365Orphaned).toHaveLength(1);
      expect(office365Orphaned[0].externalId).toBe("office2@outlook.com");
    });

    it("should handle event-type-level calendars correctly", async () => {
      const credentialId = 1;

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar1@gmail.com",
        credentialId,
        eventTypeId: null,
      });

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar2@gmail.com",
        credentialId,
        eventTypeId: 100,
      });

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "calendar3@gmail.com",
        credentialId,
        eventTypeId: 200,
      });

      const validExternalIds = ["calendar1@gmail.com", "calendar3@gmail.com"];
      const orphanedCalendars = await SelectedCalendarRepository.findOrphanedCalendars({
        credentialId,
        validExternalIds,
      });

      expect(orphanedCalendars).toHaveLength(1);
      expect(orphanedCalendars[0].externalId).toBe("calendar2@gmail.com");
      expect(orphanedCalendars[0].eventTypeId).toBe(100);
    });
  });
});
