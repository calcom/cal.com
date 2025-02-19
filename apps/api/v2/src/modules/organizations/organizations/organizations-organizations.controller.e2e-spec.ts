import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { getEnv } from "@/env";
import { hashAPIKey, stripApiKey } from "@/lib/api-key";
import { CreateOrganizationInput } from "@/modules/organizations/organizations/inputs/create-organization.input";
import { ManagedOrganizationOutput } from "@/modules/organizations/organizations/outputs/managed-organization.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { PlatformBillingRepositoryFixture } from "test/fixtures/repository/billing.repository.fixture";
import { ManagedOrganizationsRepositoryFixture } from "test/fixtures/repository/managed-organizations.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiSuccessResponse } from "@calcom/platform-types";
import { Team } from "@calcom/prisma/client";

describe("Organizations Organizations Endpoints", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let teamsRepositoryFixture: TeamRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;
  let platformBillingRepositoryFixture: PlatformBillingRepositoryFixture;
  let managedOrganizationsRepositoryFixture: ManagedOrganizationsRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;

  let managerOrg: Team;
  let managedOrg: ManagedOrganizationOutput;

  const managerOrgAdminEmail = `organizations-organizations-admin-${randomString()}@api.com`;
  let managerOrgAdmin: User;
  let managerOrgAdminApiKey: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, TokensModule],
    }).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
    teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    platformBillingRepositoryFixture = new PlatformBillingRepositoryFixture(moduleRef);
    managedOrganizationsRepositoryFixture = new ManagedOrganizationsRepositoryFixture(moduleRef);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);

    managerOrgAdmin = await userRepositoryFixture.create({
      email: managerOrgAdminEmail,
      username: managerOrgAdminEmail,
    });

    managerOrg = await organizationsRepositoryFixture.create({
      name: `organizations-organizations-organization-${randomString()}`,
      isOrganization: true,
      isPlatform: true,
    });

    await platformBillingRepositoryFixture.create(managerOrg.id, "SCALE");

    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: managerOrgAdmin.id } },
      team: { connect: { id: managerOrg.id } },
    });

    const { keyString } = await apiKeysRepositoryFixture.createApiKey(
      managerOrgAdmin.id,
      null,
      managerOrg.id
    );
    managerOrgAdminApiKey = `cal_test_${keyString}`;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  it("should create managed organization ", async () => {
    const suffix = randomString();

    const orgName = `organizations organizations org ${suffix}`;
    const orgSlug = `organization-organizations-org-created-via-api-${suffix}`;
    const orgMetadata = JSON.stringify({ key: "value" });

    return request(app.getHttpServer())
      .post(`/v2/organizations/${managerOrg.id}/organizations`)
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .send({
        name: orgName,
        slug: orgSlug,
        metadata: orgMetadata,
      } satisfies CreateOrganizationInput)
      .expect(201)
      .then(async (response) => {
        const responseBody: ApiSuccessResponse<ManagedOrganizationOutput> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        managedOrg = responseBody.data;
        expect(managedOrg?.id).toBeDefined();
        expect(managedOrg?.name).toEqual(orgName);
        expect(managedOrg?.slug).toEqual(orgSlug);
        expect(managedOrg?.metadata).toEqual(orgMetadata);
        expect(managedOrg?.apiKey).toBeDefined();

        // note(Lauris): check that managed organization is correctly setup in database
        const managedOrgInDb =
          await managedOrganizationsRepositoryFixture.getOrganizationWithManagedOrganizations(managedOrg.id);
        expect(managedOrgInDb).toBeDefined();
        expect(managedOrgInDb?.id).toEqual(managedOrg.id);
        expect(managedOrgInDb?.isPlatform).toEqual(true);
        expect(managedOrgInDb?.isOrganization).toEqual(true);
        expect(managedOrgInDb?.managedOrganization?.managedOrganizationId).toEqual(managedOrg.id);
        expect(managedOrgInDb?.managedOrganization?.managerOrganizationId).toEqual(managerOrg.id);
        // note(Lauris): check that manager organization is correctly setup in database
        const managerOrgInDb =
          await managedOrganizationsRepositoryFixture.getOrganizationWithManagedOrganizations(managerOrg.id);
        expect(managerOrgInDb).toBeDefined();
        expect(managerOrgInDb?.id).toEqual(managerOrg.id);
        expect(managerOrgInDb?.isPlatform).toEqual(true);
        expect(managerOrgInDb?.isOrganization).toEqual(true);
        expect(managerOrgInDb?.managedOrganization).toEqual(null);
        expect(managerOrgInDb?.managedOrganizations?.length).toEqual(1);
        expect(managerOrgInDb?.managedOrganizations?.[0]?.managedOrganizationId).toEqual(managedOrg.id);
        expect(managerOrgInDb?.managedOrganizations?.[0]?.managerOrganizationId).toEqual(managerOrg.id);

        // note(Lauris): test that auth user who made request to create managed organization is OWNER of it
        const membership = await membershipsRepositoryFixture.getUserMembershipByTeamId(
          managerOrgAdmin.id,
          managedOrg.id
        );
        expect(membership?.role ?? "").toEqual("OWNER");
        expect(membership?.accepted).toEqual(true);
        // note(Lauris): check that platform billing is setup correctly for manager and managed orgs
        const managerOrgBilling = await platformBillingRepositoryFixture.get(managerOrg.id);
        expect(managerOrgBilling).toBeDefined();
        expect(managerOrgBilling?.id).toBeDefined();
        const customerId = managerOrgBilling?.customerId;
        expect(customerId).toBeDefined();
        const subscriptionId = managerOrgBilling?.subscriptionId;
        expect(subscriptionId).toBeDefined();
        const plan = managerOrgBilling?.plan;
        expect(plan).toEqual("SCALE");

        const managedOrgBilling = await platformBillingRepositoryFixture.get(managedOrg.id);
        expect(managedOrgBilling).toBeDefined();
        expect(managedOrgBilling?.customerId).toEqual(customerId);
        expect(managedOrgBilling?.subscriptionId).toEqual(subscriptionId);
        expect(managedOrgBilling?.plan).toEqual(plan);
        expect(managedOrgBilling?.managerBillingId).toEqual(managerOrgBilling?.id);

        expect(managerOrgBilling?.managedBillings?.length).toEqual(1);
        expect(managerOrgBilling?.managedBillings?.[0]?.id).toEqual(managedOrgBilling?.id);

        // note(Lauris): check that in database api key is generated for managed org
        const managedOrgApiKeys = await apiKeysRepositoryFixture.getTeamApiKeys(managedOrg.id);
        expect(managedOrgApiKeys?.length).toEqual(1);
        expect(managedOrgApiKeys?.[0]?.id).toBeDefined();
        const apiKeyPrefix = getEnv("API_KEY_PREFIX", "cal_");
        const hashedKey = `${hashAPIKey(stripApiKey(managedOrg?.apiKey, apiKeyPrefix))}`;
        expect(managedOrgApiKeys?.[0]?.hashedKey).toEqual(hashedKey);
        expect(managedOrgApiKeys?.[0]?.note).toEqual(
          `Managed organization API key. ManagerOrgId: ${managerOrg.id}. ManagedOrgId: ${managedOrg.id}`
        );
      });
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(managerOrgAdmin.email);
    await organizationsRepositoryFixture.delete(managerOrg.id);
    await app.close();
  });
});
