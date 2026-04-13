import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container", () => ({
  getIntegrationAttributeSyncService: vi.fn(),
}));

import { getIntegrationAttributeSyncService } from "@calcom/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";
import type { TrpcSessionUser } from "../../../types";
import updateAttributeSyncHandler from "./update-attribute-sync.handler";

const mockService = {
  getById: vi.fn(),
  updateIncludeRulesAndMappings: vi.fn(),
  validateCredentialBelongsToOrg: vi.fn(),
};

const ORG_ID = 100;

const createCtx = (orgId = ORG_ID) => ({
  user: {
    id: 1,
    organization: { id: orgId },
  } as NonNullable<TrpcSessionUser>,
});

const baseInput = {
  id: "sync-123",
  name: "Test Sync",
  credentialId: 10,
  enabled: true,
  organizationId: ORG_ID,
  ruleId: "rule-123",
  rule: { operator: "AND" as const, conditions: [] },
  syncFieldMappings: [],
};

describe("updateAttributeSyncHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIntegrationAttributeSyncService).mockReturnValue(
      mockService as ReturnType<typeof getIntegrationAttributeSyncService>
    );
    mockService.getById.mockResolvedValue({ id: "sync-123", organizationId: ORG_ID });
    mockService.updateIncludeRulesAndMappings.mockResolvedValue(undefined);
    mockService.validateCredentialBelongsToOrg.mockResolvedValue({ id: 10, app: { slug: "salesforce" }, type: "salesforce_other_calendars" });
  });

  it("overrides organizationId with authenticated user's org", async () => {
    const input = { ...baseInput, organizationId: 999 };

    await updateAttributeSyncHandler({ ctx: createCtx(), input });

    expect(mockService.updateIncludeRulesAndMappings).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: ORG_ID })
    );
  });

  it("rejects credentialId that does not belong to user's org", async () => {
    mockService.validateCredentialBelongsToOrg.mockResolvedValue(null);

    await expect(
      updateAttributeSyncHandler({ ctx: createCtx(), input: { ...baseInput, credentialId: 50 } })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(mockService.updateIncludeRulesAndMappings).not.toHaveBeenCalled();
  });

  it("validates credentialId belongs to user's org", async () => {
    await updateAttributeSyncHandler({ ctx: createCtx(), input: baseInput });

    expect(mockService.validateCredentialBelongsToOrg).toHaveBeenCalledWith(10, ORG_ID);
  });

  it("allows update when credentialId is not provided", async () => {
    const input = { ...baseInput, credentialId: undefined };

    await updateAttributeSyncHandler({ ctx: createCtx(), input });

    expect(mockService.validateCredentialBelongsToOrg).not.toHaveBeenCalled();
    expect(mockService.updateIncludeRulesAndMappings).toHaveBeenCalled();
  });

  it("validates credentialId when value is 0 (does not skip due to falsy check)", async () => {
    const input = { ...baseInput, credentialId: 0 };

    await updateAttributeSyncHandler({ ctx: createCtx(), input });

    expect(mockService.validateCredentialBelongsToOrg).toHaveBeenCalledWith(0, ORG_ID);
  });

  it("rejects credential with unsupported integration type", async () => {
    mockService.validateCredentialBelongsToOrg.mockResolvedValue({ id: 10, app: { slug: "unsupported_app" }, type: "unsupported_type" });

    await expect(
      updateAttributeSyncHandler({ ctx: createCtx(), input: baseInput })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(mockService.updateIncludeRulesAndMappings).not.toHaveBeenCalled();
  });

  it("passes derived integration type to update when credentialId is provided", async () => {
    await updateAttributeSyncHandler({ ctx: createCtx(), input: baseInput });

    expect(mockService.updateIncludeRulesAndMappings).toHaveBeenCalledWith(
      expect.objectContaining({ integration: "salesforce" })
    );
  });

  it("rejects when sync belongs to different org", async () => {
    mockService.getById.mockResolvedValue({ id: "sync-123", organizationId: 999 });

    await expect(updateAttributeSyncHandler({ ctx: createCtx(), input: baseInput })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
