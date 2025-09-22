import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeamEventTypeCreateService } from "../implementations/TeamEventTypeCreateService";
import { EventTypePermissionService } from "../permissions/EventTypePermissionService";
import { SchedulingType } from "@calcom/prisma/enums";

// Mock EventTypePermissionService
vi.mock("../permissions/EventTypePermissionService");
vi.mock("@calcom/lib/server/repository/eventTypeRepository");

const mockEventTypePermissionService = vi.mocked(EventTypePermissionService);

describe("TeamEventTypeCreateService", () => {
  let service: TeamEventTypeCreateService;
  let mockPrisma: any;
  let mockPermissionService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {};

    mockPermissionService = {
      validateCreatePermissions: vi.fn(),
    };

    mockEventTypePermissionService.mockImplementation(() => mockPermissionService);

    service = new TeamEventTypeCreateService(mockPrisma);
  });

  describe("validatePermissions", () => {
    it("should validate permissions for team event type", async () => {
      const context = {
        userId: 1,
        teamId: 100,
        organizationId: 200,
        isOrgAdmin: false,
        userRole: "USER",
        profileId: 1,
        prisma: mockPrisma,
      };

      await service["validatePermissions"](context);

      expect(mockPermissionService.validateCreatePermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 100,
        organizationId: 200,
        isOrgAdmin: false,
        isSystemAdmin: false,
      });
    });

    it("should throw error when teamId is missing", async () => {
      const context = {
        userId: 1,
        teamId: undefined,
        organizationId: 200,
        isOrgAdmin: false,
        userRole: "USER",
        profileId: 1,
        prisma: mockPrisma,
      };

      await expect(service["validatePermissions"](context)).rejects.toThrow(
        "Team ID is required for team event type creation"
      );
    });

    it("should handle system admin correctly", async () => {
      const context = {
        userId: 1,
        teamId: 100,
        organizationId: null,
        isOrgAdmin: false,
        userRole: "ADMIN",
        profileId: 1,
        prisma: mockPrisma,
      };

      await service["validatePermissions"](context);

      expect(mockPermissionService.validateCreatePermissions).toHaveBeenCalledWith({
        userId: 1,
        teamId: 100,
        organizationId: null,
        isOrgAdmin: false,
        isSystemAdmin: true,
      });
    });
  });

  describe("prepareData", () => {
    it("should prepare data for regular team event type", async () => {
      const context = {
        userId: 1,
        teamId: 100,
        organizationId: 200,
        isOrgAdmin: false,
        userRole: "USER",
        profileId: 1,
        prisma: mockPrisma,
      };

      const data = {
        data: {
          title: "Team Event",
          slug: "team-event",
          schedulingType: SchedulingType.COLLECTIVE,
          owner: { connect: { id: 1 } },
          users: { connect: { id: 1 } },
        },
        profileId: 1,
      };

      const result = await service["prepareData"](context, data);

      expect(result.data.owner).toBeUndefined();
      expect(result.data.team).toEqual({ connect: { id: 100 } });
      expect(result.data.schedulingType).toBe(SchedulingType.COLLECTIVE);
    });

    it("should throw error when teamId is missing in prepareData", async () => {
      const context = {
        userId: 1,
        teamId: undefined,
        organizationId: 200,
        isOrgAdmin: false,
        userRole: "USER",
        profileId: 1,
        prisma: mockPrisma,
      };

      const data = {
        data: {
          title: "Team Event",
          slug: "team-event",
        },
        profileId: 1,
      };

      await expect(service["prepareData"](context, data)).rejects.toThrow(
        "Team ID is required for team event type creation"
      );
    });

    it("should remove users for managed event type", async () => {
      const context = {
        userId: 1,
        teamId: 100,
        organizationId: 200,
        isOrgAdmin: false,
        userRole: "USER",
        profileId: 1,
        prisma: mockPrisma,
      };

      const data = {
        data: {
          title: "Managed Event",
          slug: "managed-event",
          schedulingType: SchedulingType.MANAGED,
          users: { connect: { id: 1 } },
        },
        profileId: 1,
      };

      const result = await service["prepareData"](context, data);

      expect(result.data.users).toBeUndefined();
      expect(result.data.schedulingType).toBe(SchedulingType.MANAGED);
    });

    it("should remove users when any scheduling type is present", async () => {
      const context = {
        userId: 1,
        teamId: 100,
        organizationId: 200,
        isOrgAdmin: false,
        userRole: "USER",
        profileId: 1,
        prisma: mockPrisma,
      };

      const data = {
        data: {
          title: "Round Robin Event",
          slug: "round-robin",
          schedulingType: SchedulingType.ROUND_ROBIN,
          users: { connect: { id: 1 } },
        },
        profileId: 1,
      };

      const result = await service["prepareData"](context, data);

      expect(result.data.users).toBeUndefined();
      expect(result.data.schedulingType).toBe(SchedulingType.ROUND_ROBIN);
    });
  });
});