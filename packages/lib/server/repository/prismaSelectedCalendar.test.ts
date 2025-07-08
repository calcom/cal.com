import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach } from "vitest";

import prisma from "@calcom/prisma";

import { PrismaSelectedCalendarRepository } from "./prismaSelectedCalendar";

describe("PrismaSelectedCalendarRepository", () => {
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

      const result = await PrismaSelectedCalendarRepository.create(data);

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

      await PrismaSelectedCalendarRepository.create(data);

      await expect(
        PrismaSelectedCalendarRepository.create({
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

      await PrismaSelectedCalendarRepository.create(data);

      const userLevelCalendarData = {
        ...data,
        eventTypeId: null,
      };
      const created = await PrismaSelectedCalendarRepository.create(userLevelCalendarData);

      expect(created).toEqual(expect.objectContaining(userLevelCalendarData));
    });
  });

  describe("update", () => {
    it("should update a selected calendar and return it", async () => {
      const calendarToUpdate = await PrismaSelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "test@gmail.com",
        credentialId: 1,
      });

      const updatedCalendar = await PrismaSelectedCalendarRepository.update({
        where: { userId: 1, externalId: "test@gmail.com" },
        data: { integration: "office365_calendar" },
      });

      expect(updatedCalendar.id).toBe(calendarToUpdate.id);
      expect(updatedCalendar.integration).toBe("office365_calendar");
    });

    it("should throw error when trying to update multiple calendars", async () => {
      await PrismaSelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "test1@gmail.com",
        credentialId: 1,
      });

      await PrismaSelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar2",
        externalId: "test1@gmail.com",
        credentialId: 2,
      });

      await expect(
        PrismaSelectedCalendarRepository.update({
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
      const calendar = await PrismaSelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "test@gmail.com",
        credentialId: 1,
      });

      const deleted = await PrismaSelectedCalendarRepository.delete({
        where: {
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          credentialId: 1,
        },
      });

      expect(deleted).toEqual(calendar);
      const result = await PrismaSelectedCalendarRepository.findFirst({
        where: { id: calendar.id },
      });

      expect(result).toBeNull();
    });

    it("should throw error when trying to delete non-existent calendar", async () => {
      await expect(
        PrismaSelectedCalendarRepository.delete({
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
      const calendar = await PrismaSelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "test@gmail.com",
        credentialId: 1,
        eventTypeId: null, // User level calendar
      });

      const result = await PrismaSelectedCalendarRepository.findUserLevelUniqueOrThrow({
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
      await PrismaSelectedCalendarRepository.create({
        userId: 1,
        integration: "google_calendar",
        externalId: "test@gmail.com",
        credentialId: 1,
        eventTypeId: 1, // Event type level calendar
      });

      await expect(
        PrismaSelectedCalendarRepository.findUserLevelUniqueOrThrow({
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

        const existingCalendar = await PrismaSelectedCalendarRepository.create(initialData);

        const updatedData = {
          ...initialData,
          credentialId: 2,
          eventTypeId,
        };

        const result = await PrismaSelectedCalendarRepository.upsert(updatedData);

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

        const existingCalendar = await PrismaSelectedCalendarRepository.create(initialData);

        const updatedData = {
          ...initialData,
          externalId: "test2@gmail.com",
          credentialId: 2,
          eventTypeId,
        };

        const result = await PrismaSelectedCalendarRepository.upsert(updatedData);
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

        const existingCalendar = await PrismaSelectedCalendarRepository.create(initialData);

        const updatedData = {
          ...initialData,
          credentialId: 2,
          eventTypeId,
        };

        const result = await PrismaSelectedCalendarRepository.upsert(updatedData);

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

        const existingCalendar = await PrismaSelectedCalendarRepository.create(initialData);

        const updatedData = {
          ...initialData,
          credentialId: 2,
          externalId: "test2@gmail.com",
          eventTypeId,
        };

        const result = await PrismaSelectedCalendarRepository.upsert(updatedData);
        expect(await prisma.selectedCalendar.count()).toBe(2);
        expect(result).toEqual(expect.objectContaining(updatedData));
        expect(existingCalendar.id).not.toBe(result.id);
      });
    });
  });

  describe("Delegation Credential", () => {
    it("should create a selected calendar with delegationCredentialId", async () => {
      const data = {
        userId: 1,
        integration: "google_calendar",
        externalId: "test@gmail.com",
        delegationCredentialId: "delegationCredential-123",
      };

      const result = await PrismaSelectedCalendarRepository.create(data);

      expect(result).toEqual(expect.objectContaining(data));
    });

    describe("upsert", () => {
      describe("updation", () => {
        it("should update existing record with delegationCredentialId if credentialId is -1", async () => {
          const initialData = {
            userId: 1,
            integration: "google_calendar",
            externalId: "test@gmail.com",
            credentialId: 1,
            eventTypeId: null,
          };

          const existingCalendar = await PrismaSelectedCalendarRepository.create(initialData);

          const data = {
            userId: 1,
            integration: "google_calendar",
            externalId: "test@gmail.com",
            credentialId: -1,
            delegationCredentialId: "delegationCredential-123",
          };

          const result = await PrismaSelectedCalendarRepository.upsert(data);
          expect(result.id).not.toBe(null);
          expect(result.id).toBe(existingCalendar.id);
          expect(result.credentialId).toBe(null);
          expect(result.delegationCredentialId).toBe(data.delegationCredentialId);
        });

        it("should update existing record with credentialId if credentialId is valid(>0) even if delegationCredentialId is set", async () => {
          const initialData = {
            userId: 1,
            integration: "google_calendar",
            externalId: "test@gmail.com",
            credentialId: 1,
            eventTypeId: null,
          };

          const existingCalendar = await PrismaSelectedCalendarRepository.create(initialData);

          const data = {
            userId: 1,
            integration: "google_calendar",
            externalId: "test@gmail.com",
            credentialId: 2,
            delegationCredentialId: "delegationCredential-123",
          };
          const beforeDelegationCredentialId = data.delegationCredentialId;

          const result = await PrismaSelectedCalendarRepository.upsert(data);
          expect(result.id).not.toBe(null);
          expect(result.id).toBe(existingCalendar.id);
          expect(result.credentialId).toBe(data.credentialId);
          expect(result.delegationCredentialId).toBe(beforeDelegationCredentialId);
        });
      });

      describe("creation", () => {
        it("should create a new record with delegationCredentialId if credentialId is -1", async () => {
          const initialData = {
            userId: 1,
            integration: "google_calendar",
            externalId: "test@gmail.com",
            credentialId: 1,
            eventTypeId: null,
          };

          const existingCalendar = await PrismaSelectedCalendarRepository.create(initialData);

          const data = {
            userId: 1,
            integration: "google_calendar",
            externalId: "anotheremail@gmail.com",
            credentialId: -1,
            delegationCredentialId: "delegationCredential-123",
          };

          // It will create a new record because of unique constraint violation
          const result = await PrismaSelectedCalendarRepository.upsert(data);
          expect(result.id).not.toBe(null);
          expect(result.id).not.toBe(existingCalendar.id);
          expect(result.credentialId).toBe(null);
          expect(result.delegationCredentialId).toBe(data.delegationCredentialId);
        });
      });

      it("shouldnt update existing delegationCredentialId if upsert data doesn't have it", async () => {
        const initialData = {
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          eventTypeId: null,
          delegationCredentialId: "delegationCredential-123",
          credentialId: 1,
        };

        const beforeDelegationCredentialId = initialData.delegationCredentialId;
        const existingCalendar = await PrismaSelectedCalendarRepository.create(initialData);

        const data = {
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          credentialId: 1,
        };

        const result = await PrismaSelectedCalendarRepository.upsert(data);
        expect(result.id).toBe(existingCalendar.id);
        expect(result.credentialId).toBe(existingCalendar.credentialId);
        expect(result.delegationCredentialId).toBe(beforeDelegationCredentialId);
      });

      it("shouldnt update delegationCredentialId if it is undefined", async () => {
        const initialData = {
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          eventTypeId: null,
          delegationCredentialId: "delegationCredential-123",
        };

        const existingCalendar = await PrismaSelectedCalendarRepository.create(initialData);

        const data = {
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
        };

        const result = await PrismaSelectedCalendarRepository.upsert(data);
        expect(result.id).toBe(existingCalendar.id);
        expect(result.credentialId).toBe(existingCalendar.credentialId);
        expect(result.delegationCredentialId).toBe(existingCalendar.delegationCredentialId);
      });
    });
  });
});
