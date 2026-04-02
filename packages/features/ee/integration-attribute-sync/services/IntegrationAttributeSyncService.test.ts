import type { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import type { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enabledAppSlugs } from "../constants";
import type { IIntegrationAttributeSyncRepository } from "../repositories/IIntegrationAttributeSyncRepository";
import {
  IntegrationAttributeSyncService,
  UnauthorizedAttributeError,
} from "./IntegrationAttributeSyncService";

describe("IntegrationAttributeSyncService", () => {
  let service: IntegrationAttributeSyncService;
  let mockCredentialRepository: {
    findByTeamIdAndSlugs: ReturnType<typeof vi.fn>;
  };
  let mockIntegrationAttributeSyncRepository: {
    getByOrganizationId: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    getSyncFieldMappings: ReturnType<typeof vi.fn>;
    getMappedAttributeIdsByOrganization: ReturnType<typeof vi.fn>;
    getAttributeIdsByOrganization: ReturnType<typeof vi.fn>;
    updateTransactionWithRuleAndMappings: ReturnType<typeof vi.fn>;
    deleteById: ReturnType<typeof vi.fn>;
  };
  let mockTeamRepository: {
    findTeamsNotBelongingToOrgByIds: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mockCredentialRepository = {
      findByTeamIdAndSlugs: vi.fn(),
    };

    mockIntegrationAttributeSyncRepository = {
      getByOrganizationId: vi.fn(),
      getById: vi.fn(),
      getSyncFieldMappings: vi.fn(),
      getMappedAttributeIdsByOrganization: vi.fn(),
      getAttributeIdsByOrganization: vi.fn(),
      updateTransactionWithRuleAndMappings: vi.fn(),
      deleteById: vi.fn(),
    };

    mockTeamRepository = {
      findTeamsNotBelongingToOrgByIds: vi.fn(),
    };

    service = new IntegrationAttributeSyncService({
      credentialRepository: mockCredentialRepository as unknown as CredentialRepository,
      integrationAttributeSyncRepository:
        mockIntegrationAttributeSyncRepository as unknown as IIntegrationAttributeSyncRepository,
      teamRepository: mockTeamRepository as unknown as TeamRepository,
    });
  });

  describe("getEnabledAppCredentials", () => {
    it("should call credentialRepository.findByTeamIdAndSlugs with correct params", async () => {
      const organizationId = 123;
      const expectedCredentials = [
        { id: 1, type: "salesforce", teamId: organizationId },
        { id: 2, type: "salesforce", teamId: organizationId },
      ];

      mockCredentialRepository.findByTeamIdAndSlugs.mockResolvedValue(expectedCredentials);

      const result = await service.getEnabledAppCredentials(organizationId);

      expect(mockCredentialRepository.findByTeamIdAndSlugs).toHaveBeenCalledWith({
        teamId: organizationId,
        slugs: enabledAppSlugs,
      });
      expect(result).toEqual(expectedCredentials);
    });

    it("should return empty array when no credentials found", async () => {
      const organizationId = 123;
      mockCredentialRepository.findByTeamIdAndSlugs.mockResolvedValue([]);

      const result = await service.getEnabledAppCredentials(organizationId);

      expect(result).toEqual([]);
    });
  });

  describe("getAllIntegrationAttributeSyncs", () => {
    it("should call repository.getByOrganizationId with correct organizationId", async () => {
      const organizationId = 456;
      const expectedSyncs = [
        {
          id: "sync-1",
          name: "Sync 1",
          organizationId,
          integration: "salesforce",
          enabled: true,
          attributeSyncRule: null,
          syncFieldMappings: [],
        },
      ];

      mockIntegrationAttributeSyncRepository.getByOrganizationId.mockResolvedValue(expectedSyncs);

      const result = await service.getAllIntegrationAttributeSyncs(organizationId);

      expect(mockIntegrationAttributeSyncRepository.getByOrganizationId).toHaveBeenCalledWith(organizationId);
      expect(result).toEqual(expectedSyncs);
    });

    it("should return empty array when no syncs found", async () => {
      const organizationId = 456;
      mockIntegrationAttributeSyncRepository.getByOrganizationId.mockResolvedValue([]);

      const result = await service.getAllIntegrationAttributeSyncs(organizationId);

      expect(result).toEqual([]);
    });
  });

  describe("getById", () => {
    it("should call repository.getById with correct id", async () => {
      const syncId = "sync-123";
      const expectedSync = {
        id: syncId,
        name: "Test Sync",
        organizationId: 123,
        integration: "salesforce",
        enabled: true,
        attributeSyncRule: null,
        syncFieldMappings: [],
      };

      mockIntegrationAttributeSyncRepository.getById.mockResolvedValue(expectedSync);

      const result = await service.getById(syncId);

      expect(mockIntegrationAttributeSyncRepository.getById).toHaveBeenCalledWith(syncId);
      expect(result).toEqual(expectedSync);
    });

    it("should return null when sync not found", async () => {
      const syncId = "non-existent";
      mockIntegrationAttributeSyncRepository.getById.mockResolvedValue(null);

      const result = await service.getById(syncId);

      expect(result).toBeNull();
    });
  });

  describe("updateIncludeRulesAndMappings", () => {
    const baseFormData = {
      id: "sync-123",
      name: "Test Sync",
      credentialId: 1,
      enabled: true,
      organizationId: 123,
      ruleId: "rule-123",
      rule: {
        operator: "AND" as const,
        conditions: [
          {
            identifier: "teamId" as const,
            operator: "equals" as const,
            value: [1, 2],
          },
        ],
      },
    };

    it("should create new mappings when they don't have ids", async () => {
      const formData = {
        ...baseFormData,
        syncFieldMappings: [
          { integrationFieldName: "field1", attributeId: "attr-1", enabled: true },
          { integrationFieldName: "field2", attributeId: "attr-2", enabled: false },
        ],
      };

      mockIntegrationAttributeSyncRepository.getMappedAttributeIdsByOrganization.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.getAttributeIdsByOrganization.mockResolvedValue([
        "attr-1",
        "attr-2",
      ]);
      mockIntegrationAttributeSyncRepository.getSyncFieldMappings.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings.mockResolvedValue(
        undefined
      );
      mockTeamRepository.findTeamsNotBelongingToOrgByIds.mockResolvedValue([]);

      await service.updateIncludeRulesAndMappings(formData);

      expect(
        mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings
      ).toHaveBeenCalledWith({
        integrationAttributeSync: {
          id: formData.id,
          name: formData.name,
          credentialId: formData.credentialId,
          enabled: formData.enabled,
          organizationId: formData.organizationId,
        },
        attributeSyncRule: {
          id: formData.ruleId,
          rule: formData.rule,
        },
        fieldMappingsToCreate: formData.syncFieldMappings,
        fieldMappingsToUpdate: [],
        fieldMappingsToDelete: [],
      });
    });

    it("should update existing mappings when they have ids", async () => {
      const formData = {
        ...baseFormData,
        syncFieldMappings: [
          { id: "mapping-1", integrationFieldName: "field1", attributeId: "attr-1", enabled: true },
          { id: "mapping-2", integrationFieldName: "field2", attributeId: "attr-2", enabled: false },
        ],
      };

      mockIntegrationAttributeSyncRepository.getMappedAttributeIdsByOrganization.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.getAttributeIdsByOrganization.mockResolvedValue([
        "attr-1",
        "attr-2",
      ]);
      mockIntegrationAttributeSyncRepository.getSyncFieldMappings.mockResolvedValue([
        { id: "mapping-1", integrationFieldName: "field1", attributeId: "attr-1", enabled: true },
        { id: "mapping-2", integrationFieldName: "field2", attributeId: "attr-2", enabled: true },
      ]);
      mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings.mockResolvedValue(
        undefined
      );
      mockTeamRepository.findTeamsNotBelongingToOrgByIds.mockResolvedValue([]);

      await service.updateIncludeRulesAndMappings(formData);

      expect(
        mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings
      ).toHaveBeenCalledWith({
        integrationAttributeSync: {
          id: formData.id,
          name: formData.name,
          credentialId: formData.credentialId,
          enabled: formData.enabled,
          organizationId: formData.organizationId,
        },
        attributeSyncRule: {
          id: formData.ruleId,
          rule: formData.rule,
        },
        fieldMappingsToCreate: [],
        fieldMappingsToUpdate: formData.syncFieldMappings,
        fieldMappingsToDelete: [],
      });
    });

    it("should delete mappings that are no longer in the form data", async () => {
      const formData = {
        ...baseFormData,
        syncFieldMappings: [
          { id: "mapping-1", integrationFieldName: "field1", attributeId: "attr-1", enabled: true },
        ],
      };

      mockIntegrationAttributeSyncRepository.getMappedAttributeIdsByOrganization.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.getAttributeIdsByOrganization.mockResolvedValue(["attr-1"]);
      mockIntegrationAttributeSyncRepository.getSyncFieldMappings.mockResolvedValue([
        { id: "mapping-1", integrationFieldName: "field1", attributeId: "attr-1", enabled: true },
        { id: "mapping-2", integrationFieldName: "field2", attributeId: "attr-2", enabled: true },
        { id: "mapping-3", integrationFieldName: "field3", attributeId: "attr-3", enabled: true },
      ]);
      mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings.mockResolvedValue(
        undefined
      );
      mockTeamRepository.findTeamsNotBelongingToOrgByIds.mockResolvedValue([]);

      await service.updateIncludeRulesAndMappings(formData);

      expect(
        mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings
      ).toHaveBeenCalledWith({
        integrationAttributeSync: {
          id: formData.id,
          name: formData.name,
          credentialId: formData.credentialId,
          enabled: formData.enabled,
          organizationId: formData.organizationId,
        },
        attributeSyncRule: {
          id: formData.ruleId,
          rule: formData.rule,
        },
        fieldMappingsToCreate: [],
        fieldMappingsToUpdate: [formData.syncFieldMappings[0]],
        fieldMappingsToDelete: ["mapping-2", "mapping-3"],
      });
    });

    it("should handle mixed create, update, and delete operations", async () => {
      const formData = {
        ...baseFormData,
        syncFieldMappings: [
          { id: "mapping-1", integrationFieldName: "field1-updated", attributeId: "attr-1", enabled: false },
          { integrationFieldName: "field-new", attributeId: "attr-new", enabled: true },
        ],
      };

      mockIntegrationAttributeSyncRepository.getMappedAttributeIdsByOrganization.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.getAttributeIdsByOrganization.mockResolvedValue([
        "attr-1",
        "attr-new",
      ]);
      mockIntegrationAttributeSyncRepository.getSyncFieldMappings.mockResolvedValue([
        { id: "mapping-1", integrationFieldName: "field1", attributeId: "attr-1", enabled: true },
        { id: "mapping-2", integrationFieldName: "field2", attributeId: "attr-2", enabled: true },
      ]);
      mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings.mockResolvedValue(
        undefined
      );
      mockTeamRepository.findTeamsNotBelongingToOrgByIds.mockResolvedValue([]);

      await service.updateIncludeRulesAndMappings(formData);

      expect(
        mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings
      ).toHaveBeenCalledWith({
        integrationAttributeSync: {
          id: formData.id,
          name: formData.name,
          credentialId: formData.credentialId,
          enabled: formData.enabled,
          organizationId: formData.organizationId,
        },
        attributeSyncRule: {
          id: formData.ruleId,
          rule: formData.rule,
        },
        fieldMappingsToCreate: [
          { integrationFieldName: "field-new", attributeId: "attr-new", enabled: true },
        ],
        fieldMappingsToUpdate: [
          { id: "mapping-1", integrationFieldName: "field1-updated", attributeId: "attr-1", enabled: false },
        ],
        fieldMappingsToDelete: ["mapping-2"],
      });
    });

    it("should handle attribute-based conditions in rules", async () => {
      const formData = {
        ...baseFormData,
        rule: {
          operator: "OR" as const,
          conditions: [
            {
              identifier: "attributeId" as const,
              attributeId: "attr-123",
              operator: "in" as const,
              value: ["option-1", "option-2"],
            },
          ],
        },
        syncFieldMappings: [],
      };

      mockIntegrationAttributeSyncRepository.getMappedAttributeIdsByOrganization.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.getAttributeIdsByOrganization.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.getSyncFieldMappings.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings.mockResolvedValue(
        undefined
      );

      await service.updateIncludeRulesAndMappings(formData);

      expect(
        mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          attributeSyncRule: {
            id: formData.ruleId,
            rule: formData.rule,
          },
        })
      );
    });
  });

  describe("validateAttributeOwnership", () => {
    const baseFormData = {
      id: "sync-123",
      name: "Test Sync",
      credentialId: 1,
      enabled: true,
      organizationId: 123,
      ruleId: "rule-123",
      rule: {
        operator: "AND" as const,
        conditions: [
          {
            identifier: "teamId" as const,
            operator: "equals" as const,
            value: [1, 2],
          },
        ],
      },
    };

    it("should throw UnauthorizedAttributeError when attribute does not belong to organization", async () => {
      const formData = {
        ...baseFormData,
        syncFieldMappings: [
          { integrationFieldName: "field1", attributeId: "attr-1", enabled: true },
          { integrationFieldName: "field2", attributeId: "attr-invalid", enabled: true },
        ],
      };

      mockIntegrationAttributeSyncRepository.getMappedAttributeIdsByOrganization.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.getAttributeIdsByOrganization.mockResolvedValue(["attr-1"]);
      mockIntegrationAttributeSyncRepository.getSyncFieldMappings.mockResolvedValue([]);

      await expect(service.updateIncludeRulesAndMappings(formData)).rejects.toThrow(
        UnauthorizedAttributeError
      );
    });

    it("should include invalid attribute ids in the error", async () => {
      const formData = {
        ...baseFormData,
        syncFieldMappings: [
          { integrationFieldName: "field1", attributeId: "attr-valid", enabled: true },
          { integrationFieldName: "field2", attributeId: "attr-invalid-1", enabled: true },
          { integrationFieldName: "field3", attributeId: "attr-invalid-2", enabled: true },
        ],
      };

      mockIntegrationAttributeSyncRepository.getMappedAttributeIdsByOrganization.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.getAttributeIdsByOrganization.mockResolvedValue(["attr-valid"]);
      mockIntegrationAttributeSyncRepository.getSyncFieldMappings.mockResolvedValue([]);

      await expect(service.updateIncludeRulesAndMappings(formData)).rejects.toSatisfy((error) => {
        expect(error).toBeInstanceOf(UnauthorizedAttributeError);
        expect((error as UnauthorizedAttributeError).attributeIds).toEqual([
          "attr-invalid-1",
          "attr-invalid-2",
        ]);
        return true;
      });
    });

    it("should pass validation when all attributes belong to organization", async () => {
      const formData = {
        ...baseFormData,
        syncFieldMappings: [
          { integrationFieldName: "field1", attributeId: "attr-1", enabled: true },
          { integrationFieldName: "field2", attributeId: "attr-2", enabled: true },
        ],
      };

      mockIntegrationAttributeSyncRepository.getMappedAttributeIdsByOrganization.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.getAttributeIdsByOrganization.mockResolvedValue([
        "attr-1",
        "attr-2",
      ]);
      mockIntegrationAttributeSyncRepository.getSyncFieldMappings.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings.mockResolvedValue(
        undefined
      );
      mockTeamRepository.findTeamsNotBelongingToOrgByIds.mockResolvedValue([]);

      await expect(service.updateIncludeRulesAndMappings(formData)).resolves.not.toThrow();
    });

    it("should pass validation when syncFieldMappings is empty", async () => {
      const formData = {
        ...baseFormData,
        syncFieldMappings: [],
      };

      mockIntegrationAttributeSyncRepository.getMappedAttributeIdsByOrganization.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.getAttributeIdsByOrganization.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.getSyncFieldMappings.mockResolvedValue([]);
      mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings.mockResolvedValue(
        undefined
      );
      mockTeamRepository.findTeamsNotBelongingToOrgByIds.mockResolvedValue([]);

      await expect(service.updateIncludeRulesAndMappings(formData)).resolves.not.toThrow();
    });
  });

  describe("deleteById", () => {
    it("should call repository.deleteById with correct id", async () => {
      const syncId = "sync-to-delete";
      mockIntegrationAttributeSyncRepository.deleteById.mockResolvedValue(undefined);

      await service.deleteById(syncId);

      expect(mockIntegrationAttributeSyncRepository.deleteById).toHaveBeenCalledWith(syncId);
    });
  });

  describe("team validation", () => {
    describe("updateIncludeRulesAndMappings", () => {
      const baseFormData = {
        id: "sync-123",
        name: "Test Sync",
        credentialId: 1,
        enabled: true,
        organizationId: 123,
        ruleId: "rule-123",
        syncFieldMappings: [],
      };

      it("should throw error when team IDs do not belong to organization", async () => {
        const formData = {
          ...baseFormData,
          rule: {
            operator: "AND" as const,
            conditions: [
              {
                identifier: "teamId" as const,
                operator: "equals" as const,
                value: [1, 2, 3],
              },
            ],
          },
        };

        mockIntegrationAttributeSyncRepository.getMappedAttributeIdsByOrganization.mockResolvedValue([]);
        mockIntegrationAttributeSyncRepository.getAttributeIdsByOrganization.mockResolvedValue([]);
        mockTeamRepository.findTeamsNotBelongingToOrgByIds.mockResolvedValue([{ id: 2 }, { id: 3 }]);

        await expect(service.updateIncludeRulesAndMappings(formData)).rejects.toThrow(
          "Teams do not belong to this organization: 2, 3"
        );

        expect(mockTeamRepository.findTeamsNotBelongingToOrgByIds).toHaveBeenCalledWith({
          teamIds: [1, 2, 3],
          orgId: 123,
        });
      });

      it("should not validate teams when no team conditions in rule", async () => {
        const formData = {
          ...baseFormData,
          rule: {
            operator: "OR" as const,
            conditions: [
              {
                identifier: "attributeId" as const,
                attributeId: "attr-123",
                operator: "in" as const,
                value: ["option-1"],
              },
            ],
          },
        };

        mockIntegrationAttributeSyncRepository.getMappedAttributeIdsByOrganization.mockResolvedValue([]);
        mockIntegrationAttributeSyncRepository.getAttributeIdsByOrganization.mockResolvedValue([]);
        mockIntegrationAttributeSyncRepository.getSyncFieldMappings.mockResolvedValue([]);
        mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings.mockResolvedValue(
          undefined
        );

        await service.updateIncludeRulesAndMappings(formData);

        expect(mockTeamRepository.findTeamsNotBelongingToOrgByIds).not.toHaveBeenCalled();
      });

      it("should proceed when all team IDs belong to organization", async () => {
        const formData = {
          ...baseFormData,
          rule: {
            operator: "AND" as const,
            conditions: [
              {
                identifier: "teamId" as const,
                operator: "equals" as const,
                value: [1, 2],
              },
            ],
          },
        };

        mockTeamRepository.findTeamsNotBelongingToOrgByIds.mockResolvedValue([]);
        mockIntegrationAttributeSyncRepository.getMappedAttributeIdsByOrganization.mockResolvedValue([]);
        mockIntegrationAttributeSyncRepository.getAttributeIdsByOrganization.mockResolvedValue([]);
        mockIntegrationAttributeSyncRepository.getSyncFieldMappings.mockResolvedValue([]);
        mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings.mockResolvedValue(
          undefined
        );

        await service.updateIncludeRulesAndMappings(formData);

        expect(mockTeamRepository.findTeamsNotBelongingToOrgByIds).toHaveBeenCalledWith({
          teamIds: [1, 2],
          orgId: 123,
        });
        expect(
          mockIntegrationAttributeSyncRepository.updateTransactionWithRuleAndMappings
        ).toHaveBeenCalled();
      });
    });
  });
});
