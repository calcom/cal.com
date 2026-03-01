import { prisma } from "@calcom/prisma";
import { afterEach, describe, expect, it } from "vitest";
import { getDestinationCalendarRepository } from "./DestinationCalendar";

const uniqueId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const cleanupFunctions: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const cleanup of cleanupFunctions) {
    await cleanup();
  }
  cleanupFunctions.length = 0;
});

describe("DestinationCalendar DI Container Integration Tests", () => {
  describe("getDestinationCalendarRepository", () => {
    it("should return the cached repository instance", () => {
      const repo1 = getDestinationCalendarRepository();
      const repo2 = getDestinationCalendarRepository();

      expect(repo1).toBeDefined();
      expect(repo2).toBeDefined();
      expect(repo1).toBe(repo2);
    });

    it("should return null for non-existent credential custom reminder", async () => {
      const repo = getDestinationCalendarRepository();
      const reminder = await repo.getCustomReminderByCredentialId(999999999);

      expect(reminder).toBeNull();
    });

    it("should update custom reminder", async () => {
      const id = uniqueId();
      const user = await prisma.user.create({
        data: {
          email: `dcr-test-${id}@example.com`,
          username: `dcr-test-${id}`,
          name: "DestinationCalendar Test User",
        },
      });

      const credential = await prisma.credential.create({
        data: {
          userId: user.id,
          type: "google_calendar",
          key: {},
        },
      });

      const destinationCalendar = await prisma.destinationCalendar.create({
        data: {
          userId: user.id,
          integration: "google_calendar",
          externalId: `dcr-test-${id}`,
          credentialId: credential.id,
        },
      });

      cleanupFunctions.push(async () => {
        await prisma.destinationCalendar.deleteMany({
          where: { id: destinationCalendar.id },
        });
        await prisma.credential.deleteMany({ where: { id: credential.id } });
        await prisma.availability.deleteMany({
          where: { Schedule: { userId: user.id } },
        });
        await prisma.schedule.deleteMany({ where: { userId: user.id } });
        await prisma.user.deleteMany({ where: { id: user.id } });
      });

      const repo = getDestinationCalendarRepository();
      expect(await repo.getCustomReminderByCredentialId(credential.id)).toBeNull();

      await repo.updateCustomReminder({
        userId: user.id,
        credentialId: credential.id,
        integration: "google_calendar",
        customCalendarReminder: 15,
      });

      const reminder = await repo.getCustomReminderByCredentialId(credential.id);
      expect(reminder).toBe(15);

      await repo.updateCustomReminder({
        userId: user.id,
        credentialId: credential.id,
        integration: "google_calendar",
        customCalendarReminder: null,
      });
      expect(await repo.getCustomReminderByCredentialId(credential.id)).toBeNull();
    });
  });
});
