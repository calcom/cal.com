import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { getEnv } from "@/env";
import { sha256Hash, stripApiKey } from "@/lib/api-key";
import { RefreshApiKeyOutput } from "@/modules/api-keys/outputs/refresh-api-key.output";
import { CreateOAuthClientResponseDto } from "@/modules/oauth-clients/controllers/oauth-clients/responses/CreateOAuthClientResponse.dto";
import { GetOAuthClientResponseDto } from "@/modules/oauth-clients/controllers/oauth-clients/responses/GetOAuthClientResponse.dto";
import { CreateOrganizationInput } from "@/modules/organizations/organizations/inputs/create-managed-organization.input";
import { UpdateOrganizationInput } from "@/modules/organizations/organizations/inputs/update-managed-organization.input";
import { GetManagedOrganizationsOutput } from "@/modules/organizations/organizations/outputs/get-managed-organizations.output";
import {
  ManagedOrganizationWithApiKeyOutput,
  ManagedOrganizationOutput,
} from "@/modules/organizations/organizations/outputs/managed-organization.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { advanceTo, clear } from "jest-date-mock";
import { DateTime } from "luxon";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { PlatformBillingRepositoryFixture } from "test/fixtures/repository/billing.repository.fixture";
import { ManagedOrganizationsRepositoryFixture } from "test/fixtures/repository/managed-organizations.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import {
  APPS_READ,
  APPS_WRITE,
  BOOKING_READ,
  BOOKING_WRITE,
  EVENT_TYPE_READ,
  EVENT_TYPE_WRITE,
  PROFILE_READ,
  PROFILE_WRITE,
  SCHEDULE_READ,
  SCHEDULE_WRITE,
  X_CAL_SECRET_KEY,
} from "@calcom/platform-constants";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiSuccessResponse, CreateOAuthClientInput } from "@calcom/platform-types";
import type { PlatformBilling, User, Team } from "@calcom/prisma/client";

describe("Organizations Organizations Endpoints", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;
  let platformBillingRepositoryFixture: PlatformBillingRepositoryFixture;
  let managedOrganizationsRepositoryFixture: ManagedOrganizationsRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let oAuthClientsRepositoryFixture: OAuthClientRepositoryFixture;
  let profilesRepositoryFixture: ProfileRepositoryFixture;

  let managerOrg: Team;
  let payPerUserPlanManagerOrg: Team;
  let essentialsPlanManagerOrg: Team;

  let managedOrg: ManagedOrganizationWithApiKeyOutput;
  let managedOrg2: ManagedOrganizationWithApiKeyOutput;

  const managerOrgAdminEmail = `organizations-organizations-admin-${randomString()}@api.com`;
  const payPerUserPlanManagerOrgAdminEmail = `organizations-organizations-admin-${randomString()}@api.com`;
  const essentialsPlanManagerOrgAdminEmail = `organizations-organizations-admin-${randomString()}@api.com`;

  let managerOrgAdmin: User;
  let payPerUserPlanManagerOrgAdmin: User;
  let essentialsPlanManagerOrgAdmin: User;

  let managerOrgAdminApiKey: string;
  let payPerUserPlanManagerOrgAdminApiKey: string;
  let essentialsPlanManagerOrgAdminApiKey: string;

  let managerOrgBilling: PlatformBilling;

  let managedOrgApiKey: string;
  let managedOrgOAuthClientId: string;
  let managedOrgOAuthClientSecret: string;
  const createOAuthClientBody: CreateOAuthClientInput = {
    name: "OAuth client for managed organization",
    redirectUris: ["http://localhost:4321"],
    permissions: ["*"],
  };

  const newDate = new Date(2035, 0, 9, 15, 0, 0);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, TokensModule],
    }).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    platformBillingRepositoryFixture = new PlatformBillingRepositoryFixture(moduleRef);
    managedOrganizationsRepositoryFixture = new ManagedOrganizationsRepositoryFixture(moduleRef);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
    oAuthClientsRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);

    // Setup manager organization with SCALE plan
    const managerSetup = await setupTestOrganization(
      managerOrgAdminEmail,
      `organizations-organizations-organization-${randomString()}`,
      "SCALE"
    );
    managerOrgAdmin = managerSetup.admin;
    managerOrg = managerSetup.org;
    managerOrgBilling = managerSetup.billing;
    managerOrgAdminApiKey = managerSetup.apiKey;

    // Setup pay-per-user organization
    const payPerUserSetup = await setupTestOrganization(
      payPerUserPlanManagerOrgAdminEmail,
      `pay-per-user-plan-organization-${randomString()}`,
      "PER_ACTIVE_USER"
    );
    payPerUserPlanManagerOrgAdmin = payPerUserSetup.admin;
    payPerUserPlanManagerOrg = payPerUserSetup.org;
    payPerUserPlanManagerOrgAdminApiKey = payPerUserSetup.apiKey;

    // Setup essentials organization
    const essentialsSetup = await setupTestOrganization(
      essentialsPlanManagerOrgAdminEmail,
      `essentials-per-user-plan-organization-${randomString()}`,
      "ESSENTIALS"
    );
    essentialsPlanManagerOrgAdmin = essentialsSetup.admin;
    essentialsPlanManagerOrg = essentialsSetup.org;
    essentialsPlanManagerOrgAdminApiKey = essentialsSetup.apiKey;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    advanceTo(newDate);

    await app.init();
  });

  async function setupTestOrganization(
    adminEmail: string,
    orgName: string,
    plan: "SCALE" | "PER_ACTIVE_USER" | "ESSENTIALS"
  ) {
    const admin = await userRepositoryFixture.create({
      email: adminEmail,
      username: adminEmail,
    });

    const org = await organizationsRepositoryFixture.create({
      name: orgName,
      isOrganization: true,
      isPlatform: true,
    });

    await profilesRepositoryFixture.create({
      uid: `${randomString()}-uid`,
      username: adminEmail,
      user: { connect: { id: admin.id } },
      organization: { connect: { id: org.id } },
      movedFromUser: { connect: { id: admin.id } },
    });

    const billing = await platformBillingRepositoryFixture.create(org.id, plan);

    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: admin.id } },
      team: { connect: { id: org.id } },
      accepted: true,
    });

    const { keyString } = await apiKeysRepositoryFixture.createApiKey(admin.id, null, org.id);
    const apiKey = `cal_test_${keyString}`;

    return { admin, org, billing, apiKey };
  }

  function createManagedOrgInput(
    namePrefix: string,
    metadata?: Record<string, string | number | boolean>
  ): CreateOrganizationInput {
    const suffix = randomString(5);
    return {
      name: `${namePrefix} ${suffix}`,
      slug: `${namePrefix.toLowerCase().replace(/\s+/g, "-")}-${suffix}`,
      metadata: metadata || { key: "value" },
    };
  }

  afterAll(() => {
    clear();
  });

  it("should not create managed organization with string metadata", async () => {
    const suffix = randomString();

    const body = {
      name: `organizations organizations org ${suffix}`,
      metadata: JSON.stringify({ key: "value" }),
    };

    return request(app.getHttpServer())
      .post(`/v2/organizations/${managerOrg.id}/organizations`)
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .send(body)
      .expect(400);
  });

  const metadataKey = "first-org-metadata-key";
  const metadataValue = "first-org-metadata-value";
  const createManagedOrganizationBody: CreateOrganizationInput = createManagedOrgInput("org", {
    [metadataKey]: metadataValue,
  });

  const createManagedOrganizationBodySecond: CreateOrganizationInput = createManagedOrgInput("org2");

  const createManagedOrganizationBodyThird: CreateOrganizationInput = createManagedOrgInput("org3");

  it("should not allow to create managed organization if plan is below SCALE", async () => {
    const response = await request(app.getHttpServer())
      .post(`/v2/organizations/${essentialsPlanManagerOrg.id}/organizations`)
      .set("Authorization", `Bearer ${essentialsPlanManagerOrgAdminApiKey}`)
      .send(createManagedOrganizationBody)
      .expect(403);
    expect(response.body.error.message).toBe(
      `PlatformPlanGuard - organization with id=${essentialsPlanManagerOrg.id} does not have required plan for this operation. Minimum plan is SCALE while the organization has ESSENTIALS.`
    );
  });

  it("should allow to create managed organization if plan is SCALE or above", async () => {
    return request(app.getHttpServer())
      .post(`/v2/organizations/${payPerUserPlanManagerOrg.id}/organizations`)
      .set("Authorization", `Bearer ${payPerUserPlanManagerOrgAdminApiKey}`)
      .send(createManagedOrganizationBodyThird)
      .expect(201)
      .then(async (response) => {
        const responseBody: ApiSuccessResponse<ManagedOrganizationWithApiKeyOutput> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const managedOrg3 = responseBody.data;
        expect(managedOrg3?.id).toBeDefined();
        expect(managedOrg3?.name).toEqual(createManagedOrganizationBodyThird.name);
        expect(managedOrg3?.slug).toEqual(createManagedOrganizationBodyThird.slug);
        expect(managedOrg3?.metadata).toEqual(createManagedOrganizationBodyThird.metadata);
        expect(managedOrg3?.apiKey).toBeDefined();
      });
  });

  it("should create managed organization", async () => {
    return request(app.getHttpServer())
      .post(`/v2/organizations/${managerOrg.id}/organizations`)
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .send(createManagedOrganizationBody)
      .expect(201)
      .then(async (response) => {
        const responseBody: ApiSuccessResponse<ManagedOrganizationWithApiKeyOutput> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        managedOrg = responseBody.data;
        expect(managedOrg?.id).toBeDefined();
        expect(managedOrg?.name).toEqual(createManagedOrganizationBody.name);
        expect(managedOrg?.slug).toEqual(createManagedOrganizationBody.slug);
        expect(managedOrg?.metadata).toEqual(createManagedOrganizationBody.metadata);
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
        // note(Lauris): test that auth user who made request to create managed organization has profile in it
        const managedOrgProfile = await profilesRepositoryFixture.findByOrgIdUserId(
          managedOrg.id,
          managerOrgAdmin.id
        );
        expect(managedOrgProfile).toBeDefined();
        expect(managedOrgProfile?.id).toBeDefined();
        expect(managedOrgProfile?.username).toEqual(managerOrgAdmin.username);
        // note(Lauris): test that auth user who made request to create managed organization has profile in it
        const managerOrgProfile = await profilesRepositoryFixture.findByOrgIdUserId(
          managerOrg.id,
          managerOrgAdmin.id
        );
        expect(managerOrgProfile).toBeDefined();
        expect(managerOrgProfile?.id).toBeDefined();
        expect(managerOrgProfile?.username).toEqual(managerOrgAdmin.username);
        // note(Lauris): test that auth user who made request to create managed organization has movedToProfileId pointing to manager org
        const user = await userRepositoryFixture.get(managerOrgAdmin.id);
        expect(user?.movedToProfileId).toEqual(managerOrgProfile?.id);
        // note(Lauris): check that platform billing is setup correctly for manager and managed orgs
        const managerOrgBilling = await platformBillingRepositoryFixture.get(managerOrg.id);
        expect(managerOrgBilling).toBeDefined();
        expect(managerOrgBilling?.id).toBeDefined();
        const customerId = managerOrgBilling?.customerId;
        expect(customerId).toBeDefined();
        if (!customerId) {
          throw new Error(
            "organizations-organizations.controller.e2e-spec.ts: PlatformBilling customerId is not defined"
          );
        }
        const subscriptionId = managerOrgBilling?.subscriptionId;
        expect(subscriptionId).toBeDefined();
        if (!subscriptionId) {
          throw new Error(
            "organizations-organizations.controller.e2e-spec.ts: PlatformBilling subscriptionId is not defined"
          );
        }
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

        const billings = await platformBillingRepositoryFixture.getByCustomerSubscriptionIds(
          customerId,
          subscriptionId
        );
        expect(billings).toBeDefined();
        // note(Lauris): manager and manager organizaitons billings because managed organization client and subscription ids are same as manager organization billing row.
        expect(billings?.length).toEqual(2);

        // note(Lauris): check that in database api key is generated for managed org
        const managedOrgApiKeys = await apiKeysRepositoryFixture.getTeamApiKeys(managedOrg.id);
        expect(managedOrgApiKeys?.length).toEqual(1);
        expect(managedOrgApiKeys?.[0]?.id).toBeDefined();
        const apiKeyPrefix = getEnv("API_KEY_PREFIX", "cal_");
        const hashedApiKey = `${sha256Hash(stripApiKey(managedOrg?.apiKey, apiKeyPrefix))}`;
        expect(managedOrgApiKeys?.[0]?.hashedKey).toEqual(hashedApiKey);
        const expectedExpiresAt = DateTime.fromJSDate(newDate).setZone("utc").plus({ days: 30 }).toJSDate();
        expect(managedOrgApiKeys?.[0]?.expiresAt).toEqual(expectedExpiresAt);
        expect(managedOrgApiKeys?.[0]?.note).toEqual(
          `Managed organization API key. ManagerOrgId: ${managerOrg.id}. ManagedOrgId: ${managedOrg.id}`
        );
        managedOrgApiKey = managedOrg?.apiKey;
      });
  });

  it("should not create managed organization if slug already exists", async () => {
    const response = await request(app.getHttpServer())
      .post(`/v2/organizations/${managerOrg.id}/organizations`)
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .send(createManagedOrganizationBody)
      .expect(409);

    expect(response.body.error.message).toBe(
      `Organization with slug '${createManagedOrganizationBody.slug}' already exists. Please, either provide a different slug or change name so that the automatically generated slug is different.`
    );
  });

  it("should create second managed organization", async () => {
    return request(app.getHttpServer())
      .post(`/v2/organizations/${managerOrg.id}/organizations`)
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .send(createManagedOrganizationBodySecond)
      .expect(201)
      .then(async (response) => {
        const responseBody: ApiSuccessResponse<ManagedOrganizationWithApiKeyOutput> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        managedOrg2 = responseBody.data;
        expect(managedOrg2?.id).toBeDefined();
        expect(managedOrg2?.name).toEqual(createManagedOrganizationBodySecond.name);
        expect(managedOrg2?.slug).toEqual(createManagedOrganizationBodySecond.slug);
        expect(managedOrg2?.metadata).toEqual(createManagedOrganizationBodySecond.metadata);
        expect(managedOrg2?.apiKey).toBeDefined();
      });
  });

  it("should get managed organization", async () => {
    return request(app.getHttpServer())
      .get(`/v2/organizations/${managerOrg.id}/organizations/${managedOrg.id}`)
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .expect(200)
      .then(async (response) => {
        const responseBody: ApiSuccessResponse<ManagedOrganizationOutput> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const responseManagedOrg = responseBody.data;
        expect(responseManagedOrg?.id).toBeDefined();
        expect(responseManagedOrg?.name).toEqual(managedOrg.name);
        expect(responseManagedOrg?.metadata).toEqual(managedOrg.metadata);
      });
  });

  it("should get managed organizations", async () => {
    return request(app.getHttpServer())
      .get(`/v2/organizations/${managerOrg.id}/organizations`)
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .expect(200)
      .then(async (response) => {
        const responseBody: GetManagedOrganizationsOutput = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const responseManagedOrgs = responseBody.data;
        expect(responseManagedOrgs?.length).toEqual(2);
        const responseManagedOrg = responseManagedOrgs.find((org) => org.id === managedOrg.id);
        expect(responseManagedOrg?.id).toBeDefined();
        expect(responseManagedOrg?.name).toEqual(managedOrg.name);
        expect(responseManagedOrg?.metadata).toEqual(managedOrg.metadata);

        const responseManagedOrg2 = responseManagedOrgs.find((org) => org.id === managedOrg2.id);
        expect(responseManagedOrg2?.id).toBeDefined();
        expect(responseManagedOrg2?.name).toEqual(managedOrg2.name);
        expect(responseManagedOrg2?.metadata).toEqual(managedOrg2.metadata);

        expect(responseBody.pagination).toBeDefined();
        expect(responseBody.pagination.totalItems).toEqual(2);
        expect(responseBody.pagination.remainingItems).toEqual(0);
        expect(responseBody.pagination.returnedItems).toEqual(2);
        expect(responseBody.pagination.itemsPerPage).toEqual(250);
        expect(responseBody.pagination.currentPage).toEqual(1);
        expect(responseBody.pagination.totalPages).toEqual(1);
      });
  });

  it("should get managed organization by slug", async () => {
    return request(app.getHttpServer())
      .get(`/v2/organizations/${managerOrg.id}/organizations?slug=${managedOrg.slug}`)
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .expect(200)
      .then(async (response) => {
        const responseBody: GetManagedOrganizationsOutput = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const responseManagedOrgs = responseBody.data;
        expect(responseManagedOrgs?.length).toEqual(1);
        const responseManagedOrg = responseManagedOrgs.find((org) => org.id === managedOrg.id);
        expect(responseManagedOrg?.id).toBeDefined();
        expect(responseManagedOrg?.name).toEqual(managedOrg.name);
        expect(responseManagedOrg?.metadata).toEqual(managedOrg.metadata);

        expect(responseBody.pagination).toBeDefined();
        expect(responseBody.pagination.totalItems).toEqual(1);
        expect(responseBody.pagination.remainingItems).toEqual(0);
        expect(responseBody.pagination.returnedItems).toEqual(1);
        expect(responseBody.pagination.itemsPerPage).toEqual(250);
        expect(responseBody.pagination.currentPage).toEqual(1);
        expect(responseBody.pagination.totalPages).toEqual(1);
      });
  });

  it("should get managed organization by metadata key", async () => {
    return request(app.getHttpServer())
      .get(
        `/v2/organizations/${managerOrg.id}/organizations?metadataKey=${metadataKey}&metadataValue=${metadataValue}`
      )
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .expect(200)
      .then(async (response) => {
        const responseBody: GetManagedOrganizationsOutput = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const responseManagedOrgs = responseBody.data;
        expect(responseManagedOrgs?.length).toEqual(1);
        const responseManagedOrg = responseManagedOrgs.find((org) => org.id === managedOrg.id);
        expect(responseManagedOrg?.id).toBeDefined();
        expect(responseManagedOrg?.name).toEqual(managedOrg.name);
        expect(responseManagedOrg?.metadata).toEqual(managedOrg.metadata);

        expect(responseBody.pagination).toBeDefined();
        expect(responseBody.pagination.totalItems).toEqual(1);
        expect(responseBody.pagination.remainingItems).toEqual(0);
        expect(responseBody.pagination.returnedItems).toEqual(1);
        expect(responseBody.pagination.itemsPerPage).toEqual(250);
        expect(responseBody.pagination.currentPage).toEqual(1);
        expect(responseBody.pagination.totalPages).toEqual(1);
      });
  });

  it("should not update managed organization with string metadata", async () => {
    const body = {
      metadata: JSON.stringify({ key: "value" }),
    };

    return request(app.getHttpServer())
      .patch(`/v2/organizations/${managerOrg.id}/organizations/${managedOrg.id}`)
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .send(body)
      .expect(400);
  });

  it("should update managed organization ", async () => {
    const name = `new organizations organizations org ${randomString()}`;
    const metadata = {
      updatedKey: "updatedValue",
    };
    const body: UpdateOrganizationInput = {
      name,
      metadata,
    };

    return request(app.getHttpServer())
      .patch(`/v2/organizations/${managerOrg.id}/organizations/${managedOrg.id}`)
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .send(body)
      .expect(200)
      .then(async (response) => {
        const responseBody: ApiSuccessResponse<ManagedOrganizationWithApiKeyOutput> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const responseManagedOrg = responseBody.data;
        expect(responseManagedOrg?.id).toBeDefined();
        expect(responseManagedOrg?.name).toEqual(name);
        expect(responseManagedOrg?.metadata).toEqual(metadata);

        const managedOrgInDb =
          await managedOrganizationsRepositoryFixture.getOrganizationWithManagedOrganizations(managedOrg.id);
        expect(managedOrgInDb).toBeDefined();
        expect(managedOrgInDb?.name).toEqual(name);
        expect(managedOrgInDb?.metadata).toEqual(metadata);

        managedOrg = { ...managedOrg, name, metadata };
      });
  });

  it("should refresh api key for managed organization with a custom duration", async () => {
    return request(app.getHttpServer())
      .post(`/v2/api-keys/refresh`)
      .send({ apiKeyDaysValid: 60 })
      .set("Authorization", `Bearer ${managedOrgApiKey}`)
      .expect(200)
      .then(async (response) => {
        const responseBody: RefreshApiKeyOutput = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const responseData = responseBody.data;
        const newApiKey = responseData?.apiKey;
        expect(newApiKey).toBeDefined();
        expect(newApiKey).not.toEqual(managedOrgApiKey);

        const managedOrgApiKeys = await apiKeysRepositoryFixture.getTeamApiKeys(managedOrg.id);
        expect(managedOrgApiKeys?.length).toEqual(1);
        expect(managedOrgApiKeys?.[0]?.id).toBeDefined();
        const apiKeyPrefix = getEnv("API_KEY_PREFIX", "cal_");
        const hashedApiKey = `${sha256Hash(stripApiKey(newApiKey, apiKeyPrefix))}`;
        expect(managedOrgApiKeys?.[0]?.hashedKey).toEqual(hashedApiKey);
        const expectedExpiresAt = DateTime.fromJSDate(newDate).setZone("utc").plus({ days: 60 }).toJSDate();
        expect(managedOrgApiKeys?.[0]?.expiresAt).toEqual(expectedExpiresAt);
        expect(managedOrgApiKeys?.[0]?.note).toEqual(
          `Managed organization API key. ManagerOrgId: ${managerOrg.id}. ManagedOrgId: ${managedOrg.id}`
        );
        managedOrgApiKey = newApiKey;
      });
  });

  it("should create OAuth client for managed organization", async () => {
    return request(app.getHttpServer())
      .post(`/v2/oauth-clients`)
      .send(createOAuthClientBody)
      .set("Authorization", `Bearer ${managedOrgApiKey}`)
      .expect(201)
      .then(async (response) => {
        const responseBody: CreateOAuthClientResponseDto = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const responseData = responseBody.data;
        const clientId = responseData?.clientId;
        const clientSecret = responseData?.clientSecret;
        expect(clientId).toBeDefined();
        expect(clientSecret).toBeDefined();

        const managedOrgOAuthClients = await oAuthClientsRepositoryFixture.getByOrgId(managedOrg.id);
        expect(managedOrgOAuthClients?.length).toEqual(1);
        expect(managedOrgOAuthClients?.[0]?.id).toBeDefined();
        expect(managedOrgOAuthClients?.[0]?.id).toEqual(clientId);
        expect(managedOrgOAuthClients?.[0]?.secret).toEqual(clientSecret);
        expect(managedOrgOAuthClients?.[0]?.name).toEqual(createOAuthClientBody.name);
        expect(managedOrgOAuthClients?.[0]?.redirectUris).toEqual(createOAuthClientBody.redirectUris);
        expect(managedOrgOAuthClients?.[0]?.permissions).toEqual(
          EVENT_TYPE_READ +
            EVENT_TYPE_WRITE +
            BOOKING_READ +
            BOOKING_WRITE +
            SCHEDULE_READ +
            SCHEDULE_WRITE +
            APPS_READ +
            APPS_WRITE +
            PROFILE_READ +
            PROFILE_WRITE
        );
        managedOrgOAuthClientId = clientId;
        managedOrgOAuthClientSecret = clientSecret;
      });
  });

  it("should fetch OAuth client for managed organization", async () => {
    return request(app.getHttpServer())
      .get(`/v2/oauth-clients/${managedOrgOAuthClientId}`)
      .set(X_CAL_SECRET_KEY, managedOrgOAuthClientSecret)
      .expect(200)
      .then(async (response) => {
        const responseBody: GetOAuthClientResponseDto = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const responseData = responseBody.data;
        expect(responseData?.id).toEqual(managedOrgOAuthClientId);
        expect(responseData?.secret).toEqual(managedOrgOAuthClientSecret);
        expect(responseData?.name).toEqual(createOAuthClientBody.name);
        expect(responseData?.redirectUris).toEqual(createOAuthClientBody.redirectUris);
        expect(responseData?.permissions).toEqual([
          "EVENT_TYPE_READ",
          "EVENT_TYPE_WRITE",
          "BOOKING_READ",
          "BOOKING_WRITE",
          "SCHEDULE_READ",
          "SCHEDULE_WRITE",
          "APPS_READ",
          "APPS_WRITE",
          "PROFILE_READ",
          "PROFILE_WRITE",
        ]);
      });
  });

  it("should delete managed organization", async () => {
    return request(app.getHttpServer())
      .delete(`/v2/organizations/${managerOrg.id}/organizations/${managedOrg2.id}`)
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .expect(200)
      .then(async (response) => {
        const responseBody: ApiSuccessResponse<ManagedOrganizationWithApiKeyOutput> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const responseManagedOrg = responseBody.data;
        expect(responseManagedOrg?.id).toBeDefined();
        expect(responseManagedOrg?.id).toEqual(managedOrg2.id);
        expect(responseManagedOrg?.name).toEqual(managedOrg2.name);

        const managedOrgInDb =
          await managedOrganizationsRepositoryFixture.getOrganizationWithManagedOrganizations(managedOrg2.id);
        expect(managedOrgInDb).toEqual(null);

        const billings = await platformBillingRepositoryFixture.getByCustomerSubscriptionIds(
          managerOrgBilling.customerId,
          managerOrgBilling.subscriptionId!
        );
        expect(billings).toBeDefined();
        // note(Lauris): manager billing is left and other managed org
        expect(billings?.length).toEqual(2);

        const managerOrgInDb =
          await managedOrganizationsRepositoryFixture.getOrganizationWithManagedOrganizations(managerOrg.id);
        expect(managerOrgInDb).toBeDefined();
        expect(managerOrgInDb?.id).toEqual(managerOrg.id);
        expect(managerOrgInDb?.managedOrganizations?.length).toEqual(1);
      });
  });

  it("should delete managed organization", async () => {
    return request(app.getHttpServer())
      .delete(`/v2/organizations/${managerOrg.id}/organizations/${managedOrg.id}`)
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .expect(200)
      .then(async (response) => {
        const responseBody: ApiSuccessResponse<ManagedOrganizationWithApiKeyOutput> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const responseManagedOrg = responseBody.data;
        expect(responseManagedOrg?.id).toBeDefined();
        expect(responseManagedOrg?.id).toEqual(managedOrg.id);
        expect(responseManagedOrg?.name).toEqual(managedOrg.name);

        const managedOrgInDb =
          await managedOrganizationsRepositoryFixture.getOrganizationWithManagedOrganizations(managedOrg.id);
        expect(managedOrgInDb).toEqual(null);

        const billings = await platformBillingRepositoryFixture.getByCustomerSubscriptionIds(
          managerOrgBilling.customerId,
          managerOrgBilling.subscriptionId!
        );
        expect(billings).toBeDefined();
        // note(Lauris): only manager billing is left
        expect(billings?.length).toEqual(1);

        const managerOrgInDb =
          await managedOrganizationsRepositoryFixture.getOrganizationWithManagedOrganizations(managerOrg.id);
        expect(managerOrgInDb).toBeDefined();
        expect(managerOrgInDb?.id).toEqual(managerOrg.id);
        expect(managerOrgInDb?.managedOrganizations?.length).toEqual(0);
      });
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(managerOrgAdmin.email);
    await userRepositoryFixture.deleteByEmail(payPerUserPlanManagerOrgAdmin.email);
    await userRepositoryFixture.deleteByEmail(essentialsPlanManagerOrgAdmin.email);
    await organizationsRepositoryFixture.delete(managerOrg.id);
    await organizationsRepositoryFixture.delete(payPerUserPlanManagerOrg.id);
    await organizationsRepositoryFixture.delete(essentialsPlanManagerOrg.id);
    await app.close();
  });
});
