import { describe, it, expect, vi, beforeEach } from "vitest";
import { PersonalEventTypeCreateService } from "../implementations/PersonalEventTypeCreateService";
import { EventTypePermissionService } from "../permissions/EventTypePermissionService";
import { TRPCError } from "@trpc/server";

// Mock EventTypePermissionService
vi.mock("../permissions/EventTypePermissionService");
vi.mock("@calcom/lib/server/repository/eventTypeRepository");

const mockEventTypePermissionService = vi.mocked(EventTypePermissionService);

describe("PersonalEventTypeCreateService", () => {
  let service: PersonalEventTypeCreateService;
  let mockPrisma: any;
  let mockPermissionService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {};

    mockPermissionService = {
      validateCreatePermissions: vi.fn(),
    };

    mockEventTypePermissionService.mockImplementation(() => mockPermissionService);

    service = new PersonalEventTypeCreateService(mockPrisma);
  });

  describe("validatePermissions", () => {
    it("should validate permissions for personal event type", async () => {
      const context = {
        userId: 1,
        organizationId: 100,
        isOrgAdmin: false,
        userRole: "USER",
        profileId: 1,
        prisma: mockPrisma,
      };

      await service["validatePermissions"](context);

      expect(mockPermissionService.validateCreatePermissions).toHaveBeenCalledWith({
        userId: 1,
        organizationId: 100,
        isOrgAdmin: false,
        isSystemAdmin: false,
      });
    });

    it("should handle system admin correctly", async () => {
      const context = {
        userId: 1,
        organizationId: null,
        isOrgAdmin: false,
        userRole: "ADMIN",
        profileId: 1,
        prisma: mockPrisma,
      };

      await service["validatePermissions"](context);

      expect(mockPermissionService.validateCreatePermissions).toHaveBeenCalledWith({
        userId: 1,
        organizationId: null,
        isOrgAdmin: false,
        isSystemAdmin: true,
      });
    });

    it("should propagate permission errors", async () => {
      mockPermissionService.validateCreatePermissions.mockRejectedValue(
        new TRPCError({ code: "UNAUTHORIZED" })
      );

      const context = {
        userId: 1,
        organizationId: 100,
        isOrgAdmin: false,
        userRole: "USER",
        profileId: 1,
        prisma: mockPrisma,
      };

      await expect(service["validatePermissions"](context)).rejects.toThrow(TRPCError);
    });
  });

  describe("prepareData", () => {
    it("should add owner connection if not present", async () => {
      const context = {
        userId: 1,
        organizationId: null,
        isOrgAdmin: false,
        userRole: "USER",
        profileId: 1,
        prisma: mockPrisma,
      };

      const data = {
        data: {
          title: "Test Event",
          slug: "test-event",
        },
        profileId: 1,
      };

      const result = await service["prepareData"](context, data);

      expect(result.data.owner).toEqual({ connect: { id: 1 } });
      expect(result.data.users).toEqual({ connect: { id: 1 } });
    });

    it("should preserve existing owner connection", async () => {
      const context = {
        userId: 1,
        organizationId: null,
        isOrgAdmin: false,
        userRole: "USER",
        profileId: 1,
        prisma: mockPrisma,
      };

      const data = {
        data: {
          title: "Test Event",
          slug: "test-event",
          owner: { connect: { id: 2 } },
        },
        profileId: 1,
      };

      const result = await service["prepareData"](context, data);

      expect(result.data.owner).toEqual({ connect: { id: 2 } });
    });

    it("should add users connection for personal event types", async () => {
      const context = {
        userId: 1,
        organizationId: null,
        isOrgAdmin: false,
        userRole: "USER",
        profileId: 1,
        prisma: mockPrisma,
      };

      const data = {
        data: {
          title: "Test Event",
          slug: "test-event",
        },
        profileId: 1,
      };

      const result = await service["prepareData"](context, data);

      expect(result.data.users).toEqual({ connect: { id: 1 } });
    });
  });
});