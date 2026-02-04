import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { encryptServiceAccountKey } from "@calcom/platform-libraries";
import type { Team, User } from "@calcom/prisma/client";

// Mock the toggleDelegationCredentialEnabled function to bypass Google API calls
const mockToggleDelegationCredentialEnabled = jest.fn();
jest.mock("@calcom/platform-libraries/app-store", () => {
  const actual = jest.requireActual("@calcom/platform-libraries/app-store");
  return {
    ...actual,
    toggleDelegationCredentialEnabled: (...args: unknown[]) => mockToggleDelegationCredentialEnabled(...args),
  };
});

import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { PlatformBillingRepositoryFixture } from "test/fixtures/repository/billing.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { OrganizationsDelegationCredentialService } from "@/modules/organizations/delegation-credentials/services/organizations-delegation-credential.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { UpdateDelegationCredentialInput } from "@/modules/organizations/delegation-credentials/inputs/update-delegation-credential.input";
import { UpdateDelegationCredentialOutput } from "@/modules/organizations/delegation-credentials/outputs/update-delegation-credential.output";

describe("Organizations Delegation Credentials Endpoints", () => {
  describe("User Authentication - User is Org Admin", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let membershipRepositoryFixture: MembershipRepositoryFixture;
    let platformBillingRepositoryFixture: PlatformBillingRepositoryFixture;
    let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
    let profilesRepositoryFixture: ProfileRepositoryFixture;
    let prismaWriteService: PrismaWriteService;

    let org: Team;
    let user: User;
    let apiKey: string;
    let delegationCredentialId: string;
    let workspacePlatformId: number;
    let ensureDefaultCalendarsSpy: jest.SpyInstance;

    const userEmail = `delegation-credentials-admin-${randomString()}@api.com`;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, TokensModule],
      }).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      platformBillingRepositoryFixture = new PlatformBillingRepositoryFixture(moduleRef);
      apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
      profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
      prismaWriteService = moduleRef.get(PrismaWriteService);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: `delegation-credentials-organization-${randomString()}`,
        isOrganization: true,
        isPlatform: true,
      });

      await profilesRepositoryFixture.create({
        uid: `${randomString()}-uid`,
        username: userEmail,
        user: { connect: { id: user.id } },
        organization: { connect: { id: org.id } },
        movedFromUser: { connect: { id: user.id } },
      });

      await platformBillingRepositoryFixture.create(org.id, "SCALE");

      await membershipRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
        accepted: true,
      });

      const { keyString } = await apiKeysRepositoryFixture.createApiKey(user.id, null, org.id);
      apiKey = `cal_test_${keyString}`;

      const workspacePlatform = await prismaWriteService.prisma.workspacePlatform.create({
        data: {
          slug: "google",
          name: "Google Workspace",
          description: "Google Workspace for testing",
          defaultServiceAccountKey: {
            type: "service_account",
            project_id: "test-project",
            private_key_id: "test-key-id",
            private_key: "test-private-key",
            client_email: "test@test-project.iam.gserviceaccount.com",
            client_id: "123456789",
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/test",
          },
          enabled: true,
        },
      });
      workspacePlatformId = workspacePlatform.id;

      const testServiceAccountKey = {
        type: "service_account" as const,
        project_id: "test-project",
        private_key_id: "test-key-id",
        private_key: "test-private-key",
        client_email: "test@test-project.iam.gserviceaccount.com",
        client_id: "123456789",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/test",
      };

      const encryptedServiceAccountKey = encryptServiceAccountKey(testServiceAccountKey);

      const delegationCredential = await prismaWriteService.prisma.delegationCredential.create({
        data: {
          workspacePlatformId: workspacePlatform.id,
          organizationId: org.id,
          domain: "@test-domain.com",
          serviceAccountKey: encryptedServiceAccountKey,
          enabled: false,
        },
      });
      delegationCredentialId = delegationCredential.id;

      // Set up spy on prototype BEFORE app.init() - this is critical for NestJS
      ensureDefaultCalendarsSpy = jest
        .spyOn(OrganizationsDelegationCredentialService.prototype, "ensureDefaultCalendars")
        .mockResolvedValue(undefined);

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    afterEach(() => {
      // Clear the spy call history after each test
      ensureDefaultCalendarsSpy.mockClear();
      mockToggleDelegationCredentialEnabled.mockClear();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(organizationsRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
      expect(org).toBeDefined();
    });

    it("should call ensureDefaultCalendars when enabling delegation credentials", async () => {
      await prismaWriteService.prisma.delegationCredential.update({
        where: { id: delegationCredentialId },
        data: { enabled: false },
      });

      // Mock toggleDelegationCredentialEnabled to return a valid response
      mockToggleDelegationCredentialEnabled.mockResolvedValue({
        id: delegationCredentialId,
        enabled: true,
      });

      const response = await request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/delegation-credentials/${delegationCredentialId}`)
        .set("Authorization", `Bearer ${apiKey}`)
        .send({
          enabled: true,
        } satisfies UpdateDelegationCredentialInput)
        .expect(200);

      const responseBody: UpdateDelegationCredentialOutput = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data.enabled).toEqual(true);

      expect(ensureDefaultCalendarsSpy).toHaveBeenCalledWith(org.id, "@test-domain.com");
    });

    it("should not call ensureDefaultCalendars when disabling delegation credentials", async () => {
      await prismaWriteService.prisma.delegationCredential.update({
        where: { id: delegationCredentialId },
        data: { enabled: true },
      });

      // Mock toggleDelegationCredentialEnabled to return a valid response
      mockToggleDelegationCredentialEnabled.mockResolvedValue({
        id: delegationCredentialId,
        enabled: false,
      });

      const response = await request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/delegation-credentials/${delegationCredentialId}`)
        .set("Authorization", `Bearer ${apiKey}`)
        .send({
          enabled: false,
        } satisfies UpdateDelegationCredentialInput)
        .expect(200);

      const responseBody: UpdateDelegationCredentialOutput = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data.enabled).toEqual(false);

      expect(ensureDefaultCalendarsSpy).not.toHaveBeenCalled();
    });

    it("should not call ensureDefaultCalendars when enabling already enabled delegation credentials", async () => {
      await prismaWriteService.prisma.delegationCredential.update({
        where: { id: delegationCredentialId },
        data: { enabled: true },
      });

      // Mock toggleDelegationCredentialEnabled to return a valid response
      mockToggleDelegationCredentialEnabled.mockResolvedValue({
        id: delegationCredentialId,
        enabled: true,
      });

      const response = await request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/delegation-credentials/${delegationCredentialId}`)
        .set("Authorization", `Bearer ${apiKey}`)
        .send({
          enabled: true,
        } satisfies UpdateDelegationCredentialInput)
        .expect(200);

      const responseBody: UpdateDelegationCredentialOutput = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data.enabled).toEqual(true);

      expect(ensureDefaultCalendarsSpy).not.toHaveBeenCalled();
    });

    afterAll(async () => {
      if (org?.id) {
        await prismaWriteService.prisma.delegationCredential.deleteMany({
          where: { organizationId: org.id },
        });
        await organizationsRepositoryFixture.delete(org.id);
      }
      if (workspacePlatformId) {
        await prismaWriteService.prisma.workspacePlatform.delete({
          where: { id: workspacePlatformId },
        });
      }
      if (user?.email) {
        await userRepositoryFixture.deleteByEmail(user.email);
      }
      await app.close();
    });
  });
});
