import type { PrismaAttributeOptionRepository } from "@calcom/features/attributes/repositories/PrismaAttributeOptionRepository";
import type { PrismaAttributeRepository } from "@calcom/features/attributes/repositories/PrismaAttributeRepository";
import type { PrismaAttributeToUserRepository } from "@calcom/features/attributes/repositories/PrismaAttributeToUserRepository";
import type { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IFieldMapping } from "../repositories/IIntegrationAttributeSyncRepository";
import { AttributeSyncFieldMappingService } from "./AttributeSyncFieldMappingService";

describe("AttributeSyncFieldMappingService", () => {
  let service: AttributeSyncFieldMappingService;
  let mockAttributeToUserRepository: {
    deleteMany: ReturnType<typeof vi.fn>;
    createManySkipDuplicates: ReturnType<typeof vi.fn>;
  };
  let mockAttributeRepository: {
    findManyByIdsAndOrgIdWithOptions: ReturnType<typeof vi.fn>;
  };
  let mockAttributeOptionRepository: {
    createMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  let mockMembershipRepository: {
    findUniqueByUserIdAndTeamId: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mockAttributeToUserRepository = {
      deleteMany: vi.fn(),
      createManySkipDuplicates: vi.fn(),
    };

    mockAttributeRepository = {
      findManyByIdsAndOrgIdWithOptions: vi.fn(),
    };

    mockAttributeOptionRepository = {
      createMany: vi.fn(),
      findMany: vi.fn(),
    };

    mockMembershipRepository = {
      findUniqueByUserIdAndTeamId: vi.fn(),
    };

    service = new AttributeSyncFieldMappingService({
      attributeToUserRepository: mockAttributeToUserRepository as unknown as PrismaAttributeToUserRepository,
      attributeRepository: mockAttributeRepository as unknown as PrismaAttributeRepository,
      attributeOptionRepository: mockAttributeOptionRepository as unknown as PrismaAttributeOptionRepository,
      membershipRepository: mockMembershipRepository as unknown as MembershipRepository,
    });
  });

  describe("syncIntegrationFieldsToAttributes", () => {
    const baseParams = {
      userId: 1,
      organizationId: 100,
    };

    it("should return early when no membership found", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue(null);

      await service.syncIntegrationFieldsToAttributes({
        ...baseParams,
        syncFieldMappings: [
          { id: "mapping-1", integrationFieldName: "Department", attributeId: "attr-1", enabled: true },
        ],
        integrationFields: { Department: "Engineering" },
      });

      expect(mockAttributeRepository.findManyByIdsAndOrgIdWithOptions).not.toHaveBeenCalled();
      expect(mockAttributeToUserRepository.deleteMany).not.toHaveBeenCalled();
      expect(mockAttributeToUserRepository.createManySkipDuplicates).not.toHaveBeenCalled();
    });

    it("should return early when no enabled mappings with matching integration fields", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 100,
        accepted: true,
        role: "MEMBER",
        disableImpersonation: false,
      });

      await service.syncIntegrationFieldsToAttributes({
        ...baseParams,
        syncFieldMappings: [
          { id: "mapping-1", integrationFieldName: "Department", attributeId: "attr-1", enabled: false },
        ],
        integrationFields: { Department: "Engineering" },
      });

      expect(mockAttributeRepository.findManyByIdsAndOrgIdWithOptions).not.toHaveBeenCalled();
    });

    it("should sync SINGLE_SELECT attribute with matching option", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 100,
        accepted: true,
        role: "MEMBER",
        disableImpersonation: false,
      });

      mockAttributeRepository.findManyByIdsAndOrgIdWithOptions.mockResolvedValue([
        {
          id: "attr-1",
          name: "Department",
          type: "SINGLE_SELECT",
          options: [
            { id: "opt-1", value: "Engineering", slug: "engineering" },
            { id: "opt-2", value: "Sales", slug: "sales" },
          ],
        },
      ]);

      const syncFieldMappings: IFieldMapping[] = [
        { id: "mapping-1", integrationFieldName: "Department", attributeId: "attr-1", enabled: true },
      ];

      await service.syncIntegrationFieldsToAttributes({
        ...baseParams,
        syncFieldMappings,
        integrationFields: { Department: "Engineering" },
      });

      expect(mockAttributeToUserRepository.deleteMany).toHaveBeenCalledWith({
        memberId: 1,
        attributeOption: {
          attributeId: { in: ["attr-1"] },
        },
      });

      expect(mockAttributeToUserRepository.createManySkipDuplicates).toHaveBeenCalledWith([
        { memberId: 1, attributeOptionId: "opt-1" },
      ]);
    });

    it("should sync MULTI_SELECT attribute with multiple matching options", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 100,
        accepted: true,
        role: "MEMBER",
        disableImpersonation: false,
      });

      mockAttributeRepository.findManyByIdsAndOrgIdWithOptions.mockResolvedValue([
        {
          id: "attr-1",
          name: "Skills",
          type: "MULTI_SELECT",
          options: [
            { id: "opt-1", value: "JavaScript", slug: "javascript" },
            { id: "opt-2", value: "TypeScript", slug: "typescript" },
            { id: "opt-3", value: "Python", slug: "python" },
          ],
        },
      ]);

      const syncFieldMappings: IFieldMapping[] = [
        { id: "mapping-1", integrationFieldName: "Skills", attributeId: "attr-1", enabled: true },
      ];

      await service.syncIntegrationFieldsToAttributes({
        ...baseParams,
        syncFieldMappings,
        integrationFields: { Skills: "JavaScript, TypeScript" },
      });

      expect(mockAttributeToUserRepository.createManySkipDuplicates).toHaveBeenCalledWith([
        { memberId: 1, attributeOptionId: "opt-1" },
        { memberId: 1, attributeOptionId: "opt-2" },
      ]);
    });

    it("should handle case-insensitive option matching", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 100,
        accepted: true,
        role: "MEMBER",
        disableImpersonation: false,
      });

      mockAttributeRepository.findManyByIdsAndOrgIdWithOptions.mockResolvedValue([
        {
          id: "attr-1",
          name: "Department",
          type: "SINGLE_SELECT",
          options: [{ id: "opt-1", value: "Engineering", slug: "engineering" }],
        },
      ]);

      const syncFieldMappings: IFieldMapping[] = [
        { id: "mapping-1", integrationFieldName: "Department", attributeId: "attr-1", enabled: true },
      ];

      await service.syncIntegrationFieldsToAttributes({
        ...baseParams,
        syncFieldMappings,
        integrationFields: { Department: "ENGINEERING" },
      });

      expect(mockAttributeToUserRepository.createManySkipDuplicates).toHaveBeenCalledWith([
        { memberId: 1, attributeOptionId: "opt-1" },
      ]);
    });

    it("should create new option for TEXT attribute when no matching option exists", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 100,
        accepted: true,
        role: "MEMBER",
        disableImpersonation: false,
      });

      mockAttributeRepository.findManyByIdsAndOrgIdWithOptions.mockResolvedValue([
        {
          id: "attr-1",
          name: "Title",
          type: "TEXT",
          options: [],
        },
      ]);

      mockAttributeOptionRepository.findMany.mockResolvedValue([
        { id: "new-opt-1", attributeId: "attr-1", value: "Senior Engineer", slug: "senior-engineer" },
      ]);

      const syncFieldMappings: IFieldMapping[] = [
        { id: "mapping-1", integrationFieldName: "Title", attributeId: "attr-1", enabled: true },
      ];

      await service.syncIntegrationFieldsToAttributes({
        ...baseParams,
        syncFieldMappings,
        integrationFields: { Title: "Senior Engineer" },
      });

      expect(mockAttributeOptionRepository.createMany).toHaveBeenCalledWith({
        createManyInput: [{ attributeId: "attr-1", value: "Senior Engineer", slug: "senior-engineer" }],
      });

      expect(mockAttributeToUserRepository.createManySkipDuplicates).toHaveBeenCalledWith([
        { memberId: 1, attributeOptionId: "new-opt-1" },
      ]);
    });

    it("should use existing option for TEXT attribute when matching option exists", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 100,
        accepted: true,
        role: "MEMBER",
        disableImpersonation: false,
      });

      mockAttributeRepository.findManyByIdsAndOrgIdWithOptions.mockResolvedValue([
        {
          id: "attr-1",
          name: "Title",
          type: "TEXT",
          options: [{ id: "opt-1", value: "Senior Engineer", slug: "senior-engineer" }],
        },
      ]);

      const syncFieldMappings: IFieldMapping[] = [
        { id: "mapping-1", integrationFieldName: "Title", attributeId: "attr-1", enabled: true },
      ];

      await service.syncIntegrationFieldsToAttributes({
        ...baseParams,
        syncFieldMappings,
        integrationFields: { Title: "Senior Engineer" },
      });

      expect(mockAttributeOptionRepository.createMany).not.toHaveBeenCalled();
      expect(mockAttributeToUserRepository.createManySkipDuplicates).toHaveBeenCalledWith([
        { memberId: 1, attributeOptionId: "opt-1" },
      ]);
    });

    it("should skip mapping when attribute not found", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 100,
        accepted: true,
        role: "MEMBER",
        disableImpersonation: false,
      });

      mockAttributeRepository.findManyByIdsAndOrgIdWithOptions.mockResolvedValue([]);

      const syncFieldMappings: IFieldMapping[] = [
        { id: "mapping-1", integrationFieldName: "Department", attributeId: "attr-1", enabled: true },
      ];

      await service.syncIntegrationFieldsToAttributes({
        ...baseParams,
        syncFieldMappings,
        integrationFields: { Department: "Engineering" },
      });

      expect(mockAttributeToUserRepository.deleteMany).not.toHaveBeenCalled();
      expect(mockAttributeToUserRepository.createManySkipDuplicates).not.toHaveBeenCalled();
    });

    it("should skip non-matching options for SINGLE_SELECT attribute", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 100,
        accepted: true,
        role: "MEMBER",
        disableImpersonation: false,
      });

      mockAttributeRepository.findManyByIdsAndOrgIdWithOptions.mockResolvedValue([
        {
          id: "attr-1",
          name: "Department",
          type: "SINGLE_SELECT",
          options: [
            { id: "opt-1", value: "Engineering", slug: "engineering" },
            { id: "opt-2", value: "Sales", slug: "sales" },
          ],
        },
      ]);

      const syncFieldMappings: IFieldMapping[] = [
        { id: "mapping-1", integrationFieldName: "Department", attributeId: "attr-1", enabled: true },
      ];

      await service.syncIntegrationFieldsToAttributes({
        ...baseParams,
        syncFieldMappings,
        integrationFields: { Department: "Marketing" },
      });

      expect(mockAttributeToUserRepository.deleteMany).toHaveBeenCalledWith({
        memberId: 1,
        attributeOption: {
          attributeId: { in: ["attr-1"] },
        },
      });

      expect(mockAttributeToUserRepository.createManySkipDuplicates).not.toHaveBeenCalled();
    });

    it("should handle multiple mappings for different attributes", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 100,
        accepted: true,
        role: "MEMBER",
        disableImpersonation: false,
      });

      mockAttributeRepository.findManyByIdsAndOrgIdWithOptions.mockResolvedValue([
        {
          id: "attr-1",
          name: "Department",
          type: "SINGLE_SELECT",
          options: [{ id: "opt-1", value: "Engineering", slug: "engineering" }],
        },
        {
          id: "attr-2",
          name: "Level",
          type: "SINGLE_SELECT",
          options: [{ id: "opt-2", value: "Senior", slug: "senior" }],
        },
      ]);

      const syncFieldMappings: IFieldMapping[] = [
        { id: "mapping-1", integrationFieldName: "Department", attributeId: "attr-1", enabled: true },
        { id: "mapping-2", integrationFieldName: "Level", attributeId: "attr-2", enabled: true },
      ];

      await service.syncIntegrationFieldsToAttributes({
        ...baseParams,
        syncFieldMappings,
        integrationFields: { Department: "Engineering", Level: "Senior" },
      });

      expect(mockAttributeToUserRepository.deleteMany).toHaveBeenCalledWith({
        memberId: 1,
        attributeOption: {
          attributeId: { in: ["attr-1", "attr-2"] },
        },
      });

      expect(mockAttributeToUserRepository.createManySkipDuplicates).toHaveBeenCalledWith([
        { memberId: 1, attributeOptionId: "opt-1" },
        { memberId: 1, attributeOptionId: "opt-2" },
      ]);
    });

    it("should only process enabled mappings", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 100,
        accepted: true,
        role: "MEMBER",
        disableImpersonation: false,
      });

      mockAttributeRepository.findManyByIdsAndOrgIdWithOptions.mockResolvedValue([
        {
          id: "attr-1",
          name: "Department",
          type: "SINGLE_SELECT",
          options: [{ id: "opt-1", value: "Engineering", slug: "engineering" }],
        },
      ]);

      const syncFieldMappings: IFieldMapping[] = [
        { id: "mapping-1", integrationFieldName: "Department", attributeId: "attr-1", enabled: true },
        { id: "mapping-2", integrationFieldName: "Level", attributeId: "attr-2", enabled: false },
      ];

      await service.syncIntegrationFieldsToAttributes({
        ...baseParams,
        syncFieldMappings,
        integrationFields: { Department: "Engineering", Level: "Senior" },
      });

      expect(mockAttributeRepository.findManyByIdsAndOrgIdWithOptions).toHaveBeenCalledWith({
        attributeIds: ["attr-1"],
        orgId: 100,
      });
    });

    it("should handle SINGLE_SELECT with comma-separated value by taking first value only", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 100,
        accepted: true,
        role: "MEMBER",
        disableImpersonation: false,
      });

      mockAttributeRepository.findManyByIdsAndOrgIdWithOptions.mockResolvedValue([
        {
          id: "attr-1",
          name: "Department",
          type: "SINGLE_SELECT",
          options: [
            { id: "opt-1", value: "Engineering", slug: "engineering" },
            { id: "opt-2", value: "Sales", slug: "sales" },
          ],
        },
      ]);

      const syncFieldMappings: IFieldMapping[] = [
        { id: "mapping-1", integrationFieldName: "Department", attributeId: "attr-1", enabled: true },
      ];

      await service.syncIntegrationFieldsToAttributes({
        ...baseParams,
        syncFieldMappings,
        integrationFields: { Department: "Engineering, Sales" },
      });

      expect(mockAttributeToUserRepository.createManySkipDuplicates).toHaveBeenCalledWith([
        { memberId: 1, attributeOptionId: "opt-1" },
      ]);
    });

    it("should handle NUMBER attribute type", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 100,
        accepted: true,
        role: "MEMBER",
        disableImpersonation: false,
      });

      mockAttributeRepository.findManyByIdsAndOrgIdWithOptions.mockResolvedValue([
        {
          id: "attr-1",
          name: "Years of Experience",
          type: "NUMBER",
          options: [],
        },
      ]);

      mockAttributeOptionRepository.findMany.mockResolvedValue([
        { id: "new-opt-1", attributeId: "attr-1", value: "5", slug: "5" },
      ]);

      const syncFieldMappings: IFieldMapping[] = [
        { id: "mapping-1", integrationFieldName: "Experience", attributeId: "attr-1", enabled: true },
      ];

      await service.syncIntegrationFieldsToAttributes({
        ...baseParams,
        syncFieldMappings,
        integrationFields: { Experience: "5" },
      });

      expect(mockAttributeOptionRepository.createMany).toHaveBeenCalledWith({
        createManyInput: [{ attributeId: "attr-1", value: "5", slug: "5" }],
      });
    });

    it("should clear old assignments even when field value is empty", async () => {
      mockMembershipRepository.findUniqueByUserIdAndTeamId.mockResolvedValue({
        id: 1,
        userId: 1,
        teamId: 100,
        accepted: true,
        role: "MEMBER",
        disableImpersonation: false,
      });

      mockAttributeRepository.findManyByIdsAndOrgIdWithOptions.mockResolvedValue([
        {
          id: "attr-1",
          name: "Skills",
          type: "MULTI_SELECT",
          options: [{ id: "opt-1", value: "JavaScript", slug: "javascript" }],
        },
      ]);

      const syncFieldMappings: IFieldMapping[] = [
        { id: "mapping-1", integrationFieldName: "Skills", attributeId: "attr-1", enabled: true },
      ];

      await service.syncIntegrationFieldsToAttributes({
        ...baseParams,
        syncFieldMappings,
        integrationFields: { Skills: "" },
      });

      expect(mockAttributeToUserRepository.deleteMany).toHaveBeenCalledWith({
        memberId: 1,
        attributeOption: {
          attributeId: { in: ["attr-1"] },
        },
      });

      expect(mockAttributeToUserRepository.createManySkipDuplicates).not.toHaveBeenCalled();
    });
  });
});
