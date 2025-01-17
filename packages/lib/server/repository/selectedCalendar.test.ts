import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach } from "vitest";

import prisma from "@calcom/prisma";

import { SelectedCalendarRepository } from "./selectedCalendar";

describe("SelectedCalendarRepository", () => {
  beforeEach(() => {
    prismock.selectedCalendar.deleteMany();
  });

  describe("create", () => {
    it("should create a selected calendar", async () => {
      const data = {
        userId: 1,
        integration: "google_calendar",
        externalId: "test@gmail.com",
        credentialId: 1,
      };

      const result = await SelectedCalendarRepository.create(data);

      expect(result).toEqual(expect.objectContaining(data));
    });

    it("should throw error if we try to create a user-level calendar with same userId_integration_externalId as an existing user-level calendar", async () => {
      const data = {
        userId: 1,
        integration: "google_calendar",
        externalId: "test@gmail.com",
        credentialId: 1,
        eventTypeId: null,
      };

      await SelectedCalendarRepository.create(data);

      await expect(
        SelectedCalendarRepository.create({
          ...data,
          credentialId: 2,
        })
      ).rejects.toThrow("Selected calendar already exists");
    });

    it("should allow creating a user-level calendar with same userId_integration_externalId as an existing event-type level calendar", async () => {
      const data = {
        userId: 1,
        integration: "google_calendar",
        externalId: "test@gmail.com",
        credentialId: 1,
        eventTypeId: 1,
      };

      await SelectedCalendarRepository.create(data);

      const userLevelCalendarData = {
        ...data,
        eventTypeId: null,
      };
      const created = await SelectedCalendarRepository.create(userLevelCalendarData);

      expect(created).toEqual(expect.objectContaining(userLevelCalendarData));
    });
  });

  describe("update", () => {
    it("should update a selected calendar and return it", async () => {
      const calendarToUpdate = await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "test@gmail.com",
        credentialId: 1,
      });

      const updatedCalendar = await SelectedCalendarRepository.update({
        where: { userId: 1, externalId: "test@gmail.com" },
        data: { integration: "office365_calendar" },
      });

      expect(updatedCalendar.id).toBe(calendarToUpdate.id);
      expect(updatedCalendar.integration).toBe("office365_calendar");
    });

    it("should throw error when trying to update multiple calendars", async () => {
      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "test1@gmail.com",
        credentialId: 1,
      });

      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar2",
        externalId: "test1@gmail.com",
        credentialId: 2,
      });

      await expect(
        SelectedCalendarRepository.update({
          where: { userId: 1, externalId: "test1@gmail.com" },
          data: { integration: "office365_calendar" },
        })
      ).rejects.toThrow(
        "Multiple SelectedCalendar records found to update. updateMany should be used instead"
      );
    });
  });

  describe("delete", () => {
    it("should delete a selected calendar and return it", async () => {
      const calendar = await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "test@gmail.com",
        credentialId: 1,
      });

      const deleted = await SelectedCalendarRepository.delete({
        where: {
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          credentialId: 1,
        },
      });

      expect(deleted).toEqual(calendar);
      const result = await SelectedCalendarRepository.findFirst({
        where: { id: calendar.id },
      });

      expect(result).toBeNull();
    });

    it("should throw error when trying to delete non-existent calendar", async () => {
      await expect(
        SelectedCalendarRepository.delete({
          where: {
            userId: 999,
            integration: "google_calendar",
            externalId: "nonexistent@gmail.com",
            credentialId: 999,
          },
        })
      ).rejects.toThrow("SelectedCalendar not found");
    });
  });

  describe("findUserLevelUniqueOrThrow", () => {
    it("should find user level calendar", async () => {
      const calendar = await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "test@gmail.com",
        credentialId: 1,
        eventTypeId: null, // User level calendar
      });

      const result = await SelectedCalendarRepository.findUserLevelUniqueOrThrow({
        where: { userId: 1, externalId: "test@gmail.com" },
      });

      expect(result).toEqual(
        expect.objectContaining({
          userId: calendar.userId,
          externalId: calendar.externalId,
        })
      );
    });

    it("should not find event type level calendar", async () => {
      await SelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "test@gmail.com",
        credentialId: 1,
        eventTypeId: 1, // Event type level calendar
      });

      await expect(
        SelectedCalendarRepository.findUserLevelUniqueOrThrow({
          where: { userId: 1, externalId: "test@gmail.com" },
        })
      ).rejects.toThrow("SelectedCalendar not found");
    });
  });

  describe("upsert", () => {
    describe("User Level Calendar", () => {
      const eventTypeId = null;
      it("should update existing calendar as long as a record with same userId_integration_externalId is present for eventTypeId=null", async () => {
        const initialData = {
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          credentialId: 1,
          eventTypeId,
        };

        const existingCalendar = await SelectedCalendarRepository.create(initialData);

        const updatedData = {
          ...initialData,
          credentialId: 2,
          eventTypeId,
        };

        const result = await SelectedCalendarRepository.upsert(updatedData);

        expect(result.credentialId).toBe(2);
        expect(existingCalendar.id).toBe(result.id);
      });

      it("should create new calendar if no record with same userId_integration_externalId is present when eventTypeId=null", async () => {
        const initialData = {
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          credentialId: 1,
          eventTypeId,
        };

        const existingCalendar = await SelectedCalendarRepository.create(initialData);

        const updatedData = {
          ...initialData,
          externalId: "test2@gmail.com",
          credentialId: 2,
          eventTypeId,
        };

        const result = await SelectedCalendarRepository.upsert(updatedData);
        expect(await prisma.selectedCalendar.count()).toBe(2);
        expect(result).toEqual(expect.objectContaining(updatedData));
        expect(existingCalendar.id).not.toBe(result.id);
      });
    });

    describe("Event Type Level Calendar", () => {
      const eventTypeId = 101;
      it("should update existing calendar as long as record with same userId_integration_externalId_eventTypeId is present", async () => {
        const initialData = {
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          credentialId: 1,
          eventTypeId,
        };

        const existingCalendar = await SelectedCalendarRepository.create(initialData);

        const updatedData = {
          ...initialData,
          credentialId: 2,
          eventTypeId,
        };

        const result = await SelectedCalendarRepository.upsert(updatedData);

        expect(result.credentialId).toBe(2);
        expect(existingCalendar.id).toBe(result.id);
      });

      it("should create new calendar if no record with same userId_integration_externalId_eventTypeId is present", async () => {
        const initialData = {
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          credentialId: 1,
          eventTypeId,
        };

        const existingCalendar = await SelectedCalendarRepository.create(initialData);

        const updatedData = {
          ...initialData,
          credentialId: 2,
          externalId: "test2@gmail.com",
          eventTypeId,
        };

        const result = await SelectedCalendarRepository.upsert(updatedData);
        expect(await prisma.selectedCalendar.count()).toBe(2);
        expect(result).toEqual(expect.objectContaining(updatedData));
        expect(existingCalendar.id).not.toBe(result.id);
      });
    });
  });
});
