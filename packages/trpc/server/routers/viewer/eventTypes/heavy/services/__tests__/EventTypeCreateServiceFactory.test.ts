import { describe, it, expect, vi } from "vitest";
import { EventTypeCreateServiceFactory } from "../factory/EventTypeCreateServiceFactory";
import { PersonalEventTypeCreateService } from "../implementations/PersonalEventTypeCreateService";
import { TeamEventTypeCreateService } from "../implementations/TeamEventTypeCreateService";
import { SchedulingType } from "@calcom/prisma/enums";

describe("EventTypeCreateServiceFactory", () => {
  const mockPrisma = {} as any;

  describe("createService", () => {
    it("should create TeamEventTypeCreateService when teamId and schedulingType provided", () => {
      const service = EventTypeCreateServiceFactory.createService(mockPrisma, {
        teamId: 100,
        schedulingType: SchedulingType.COLLECTIVE,
      });

      expect(service).toBeInstanceOf(TeamEventTypeCreateService);
    });

    it("should create PersonalEventTypeCreateService when no teamId", () => {
      const service = EventTypeCreateServiceFactory.createService(mockPrisma, {});

      expect(service).toBeInstanceOf(PersonalEventTypeCreateService);
    });

    it("should create PersonalEventTypeCreateService when teamId but no schedulingType", () => {
      const service = EventTypeCreateServiceFactory.createService(mockPrisma, {
        teamId: 100,
      });

      expect(service).toBeInstanceOf(PersonalEventTypeCreateService);
    });

    it("should create PersonalEventTypeCreateService when schedulingType but no teamId", () => {
      const service = EventTypeCreateServiceFactory.createService(mockPrisma, {
        schedulingType: SchedulingType.COLLECTIVE,
      });

      expect(service).toBeInstanceOf(PersonalEventTypeCreateService);
    });
  });
});