import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, expect, it, beforeEach, vi } from "vitest";

import { encryptServiceAccountKey } from "@calcom/lib/server/serviceAccountKey";

import { DelegationCredentialRepository } from "./DelegationCredentialRepository";

const mockOrganizationRepository = {
  findByMemberEmail: vi.fn(),
};

vi.mock("@calcom/features/ee/organizations/di/OrganizationRepository.container", () => ({
  getOrganizationRepository: () => mockOrganizationRepository,
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

// Mock service account key functions
vi.mock("@calcom/lib/crypto", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const actual = await importOriginal<typeof import("@calcom/lib/crypto")>();
  return {
    ...actual,
    symmetricEncrypt: vi.fn((serviceAccountKey) => {
      console.log({ mockEncrypted: serviceAccountKey });
      return `encrypted(${serviceAccountKey})`;
    }),
    symmetricDecrypt: vi.fn((serviceAccountKey) => {
      return serviceAccountKey.replace(/^encrypted\((.*)\)$/, "$1");
    }),
  };
});
// Test Data Helpers
const buildMockServiceAccountKey = () => ({
  client_email: "test@example.com",
  private_key: "private-key",
  client_id: "client-id",
  additional_field: "value",
});

const buildMockEncryptedServiceAccountKey = () => ({
  client_email: "test@example.com",
  client_id: "client-id",
  encrypted_credentials: 'encrypted({"private_key":"private-key"})',
  additional_field: "value",
});

const buildMockWorkspacePlatform = () => ({
  id: 1,
  name: "Test Platform",
  slug: "test-platform",
});

const buildMockOrganization = () => ({
  id: 1,
  name: "Test Organization",
  isOrganization: true,
});

const buildMockDelegationCredential = (overrides = {}) => ({
  id: "test-id",
  enabled: true,
  domain: "example.com",
  organizationId: 1,
  workspacePlatformId: 1,
  serviceAccountKey: buildMockServiceAccountKey(),
  workspacePlatform: buildMockWorkspacePlatform(),
  ...overrides,
});

// Test Utilities
const createTestDelegationCredential = async (overrides = {}) => {
  // Create organization first (as a team with isOrganization true)
  await prismock.team.create({
    data: buildMockOrganization(),
  });

  // Create workspace platform
  await prismock.workspacePlatform.create({
    data: buildMockWorkspacePlatform(),
  });

  const data = buildMockDelegationCredential(overrides);

  return await prismock.delegationCredential.create({
    data: {
      ...data,
      serviceAccountKey: encryptServiceAccountKey(data.serviceAccountKey),
    },
    include: {
      workspacePlatform: true,
    },
  });
};

const setupOrganizationMock = (returnValue: { id: number } | null) => {
  mockOrganizationRepository.findByMemberEmail.mockResolvedValue(returnValue);
};

describe("DelegationCredentialRepository", () => {
  beforeEach(() => {
    prismock.delegationCredential.deleteMany();
    prismock.workspacePlatform.deleteMany();
    prismock.team.deleteMany();
    vi.clearAllMocks();
  });

  describe("Service Account Key Access Control", () => {
    beforeEach(async () => {
      await createTestDelegationCredential();
    });

    describe("Regular Find Methods (No Service Account Key)", () => {
      describe("findById", () => {
        it("should not expose service account key in response", async () => {
          const result = await DelegationCredentialRepository.findById({ id: "test-id" });

          expect(result).not.toHaveProperty("serviceAccountKey");
          expect(result).toEqual(
            expect.objectContaining({
              id: "test-id",
              enabled: true,
              domain: "example.com",
            })
          );
        });
      });

      describe("findAllByDomain", () => {
        it("should not expose service account key in any of the results", async () => {
          const results = await DelegationCredentialRepository.findAllByDomain({ domain: "example.com" });

          expect(results.length).toBeGreaterThan(0);
          results.forEach((result) => {
            expect(result).not.toHaveProperty("serviceAccountKey");
            expect(result).toEqual(
              expect.objectContaining({
                domain: "example.com",
              })
            );
          });
        });
      });
    });

    describe("Sensitive Methods (With Service Account Key)", () => {
      describe("findByIdIncludeSensitiveServiceAccountKey", () => {
        it("should expose valid service account key", async () => {
          const result = await DelegationCredentialRepository.findByIdIncludeSensitiveServiceAccountKey({
            id: "test-id",
          });

          expect(result).toHaveProperty("serviceAccountKey");
          expect(result?.serviceAccountKey).toEqual(buildMockServiceAccountKey());
        });
      });

      describe("findByOrgIdIncludeSensitiveServiceAccountKey", () => {
        it("should expose validated service account keys", async () => {
          const results = await DelegationCredentialRepository.findByOrgIdIncludeSensitiveServiceAccountKey({
            organizationId: 1,
          });

          expect(results.length).toEqual(1);
          const result = results[0];
          expect(result).toHaveProperty("serviceAccountKey");
          expect(result.serviceAccountKey).toEqual(buildMockEncryptedServiceAccountKey());
        });
      });

      describe("findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey", () => {
        it("should expose validated service account key", async () => {
          const result =
            await DelegationCredentialRepository.findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey(
              {
                organizationId: 1,
                domain: "example.com",
              }
            );

          expect(result).toHaveProperty("serviceAccountKey");
          expect(result?.serviceAccountKey).toEqual(buildMockServiceAccountKey());
        });
      });

      describe("findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey", () => {
        it("should return valid delegation when email exists in organization", async () => {
          setupOrganizationMock({ id: 1 });

          const result =
            await DelegationCredentialRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey({
              email: "user@example.com",
            });

          expect(result).toHaveProperty("serviceAccountKey");
          expect(result?.serviceAccountKey).toEqual(buildMockServiceAccountKey());
          expect(result?.domain).toBe("example.com");
        });

        it("should return null when email not found in any organization", async () => {
          setupOrganizationMock(null);

          const result =
            await DelegationCredentialRepository.findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey({
              email: "nonexistent@example.com",
            });

          expect(result).toBeNull();
        });
      });
    });
  });

  describe("CRUD Operations", () => {
    describe("create", () => {
      it("should store delegation credential with all required fields and establish connections", async () => {
        // Create organization first (as a team with isOrganization true)
        await prismock.team.create({
          data: buildMockOrganization(),
        });

        // Create workspace platform
        const workspacePlatform = await prismock.workspacePlatform.create({
          data: buildMockWorkspacePlatform(),
        });

        const data = buildMockDelegationCredential();
        delete data.id; // ID is auto-generated
        delete data.workspacePlatform; // Don't include the relation in create

        const result = await DelegationCredentialRepository.create(data);

        expect(result).toEqual({
          id: expect.any(String),
          domain: data.domain,
          enabled: data.enabled,
          createdAt: expect.any(Date),
          lastEnabledAt: null,
          lastDisabledAt: null,
          updatedAt: null,
          organizationId: data.organizationId,
          workspacePlatform: {
            name: workspacePlatform.name,
            slug: workspacePlatform.slug,
          },
        });
      });
    });

    describe("update", () => {
      it("should modify workspace platform connection when workspacePlatformId is provided", async () => {
        const created = await createTestDelegationCredential();

        // Create new workspace platform
        const newWorkspacePlatform = await prismock.workspacePlatform.create({
          data: {
            id: 2,
            name: "New Platform",
            slug: "new-platform",
          },
        });

        const result = await DelegationCredentialRepository.updateById({
          id: created.id,
          data: { workspacePlatformId: newWorkspacePlatform.id },
        });

        expect(result).toEqual({
          id: created.id,
          domain: created.domain,
          enabled: created.enabled,
          createdAt: expect.any(Date),
          lastEnabledAt: created.lastEnabledAt,
          lastDisabledAt: created.lastDisabledAt,
          updatedAt: null,
          organizationId: created.organizationId,
          workspacePlatform: {
            name: newWorkspacePlatform.name,
            slug: newWorkspacePlatform.slug,
          },
        });
      });

      it("should modify organization connection when organizationId is provided", async () => {
        const created = await createTestDelegationCredential();

        // Create new organization (as a team with isOrganization true)
        const newOrganization = await prismock.team.create({
          data: {
            id: 2,
            name: "New Organization",
            isOrganization: true,
          },
        });

        const result = await DelegationCredentialRepository.updateById({
          id: created.id,
          data: { organizationId: newOrganization.id },
        });

        expect(result).toEqual({
          id: created.id,
          lastEnabledAt: created.lastEnabledAt,
          lastDisabledAt: created.lastDisabledAt,
          domain: created.domain,
          enabled: created.enabled,
          createdAt: expect.any(Date),
          updatedAt: null,
          organizationId: newOrganization.id,
          workspacePlatform: {
            name: expect.any(String),
            slug: expect.any(String),
          },
        });
      });

      it("should modify specified fields while preserving others", async () => {
        const created = await createTestDelegationCredential();

        const result = await DelegationCredentialRepository.updateById({
          id: created.id,
          data: { enabled: false },
        });

        expect(result).toEqual(
          expect.objectContaining({
            id: created.id,
            enabled: false, // Changed
            domain: created.domain, // Preserved
          })
        );
      });
    });

    describe("delete", () => {
      it("should remove the delegation credential completely", async () => {
        const created = await createTestDelegationCredential();

        await DelegationCredentialRepository.deleteById({ id: created.id });

        const result = await prismock.delegationCredential.findUnique({
          where: { id: created.id },
        });
        expect(result).toBeNull();
      });
    });
  });
});
