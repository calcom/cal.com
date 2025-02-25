import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { getEnv } from "@/env";
import { hashAPIKey, stripApiKey } from "@/lib/api-key";
import { RefreshApiKeyOutput } from "@/modules/api-keys/outputs/refresh-api-key.output";
import { CreateOAuthClientResponseDto } from "@/modules/oauth-clients/controllers/oauth-clients/responses/CreateOAuthClientResponse.dto";
import { GetOAuthClientResponseDto } from "@/modules/oauth-clients/controllers/oauth-clients/responses/GetOAuthClientResponse.dto";
import { CreateOrganizationInput } from "@/modules/organizations/organizations/inputs/create-managed-organization.input";
import { UpdateOrganizationInput } from "@/modules/organizations/organizations/inputs/update-managed-organization.input";
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
import { PlatformBilling, User } from "@prisma/client";
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
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
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
import { ApiSuccessResponse, CreateOAuthClientInput } from "@calcom/platform-types";
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
  let oAuthClientsRepositoryFixture: OAuthClientRepositoryFixture;
  let profilesRepositoryFixture: ProfileRepositoryFixture;

  let managerOrg: Team;
  let managedOrg: ManagedOrganizationWithApiKeyOutput;
  const managerOrgAdminEmail = `organizations-organizations-admin-${randomString()}@api.com`;
  let managerOrgAdmin: User;
  let managerOrgAdminApiKey: string;
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
    teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    platformBillingRepositoryFixture = new PlatformBillingRepositoryFixture(moduleRef);
    managedOrganizationsRepositoryFixture = new ManagedOrganizationsRepositoryFixture(moduleRef);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
    oAuthClientsRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);

    managerOrgAdmin = await userRepositoryFixture.create({
      email: managerOrgAdminEmail,
      username: managerOrgAdminEmail,
    });

    managerOrg = await organizationsRepositoryFixture.create({
      name: `organizations-organizations-organization-${randomString()}`,
      isOrganization: true,
      isPlatform: true,
    });

    await profilesRepositoryFixture.create({
      uid: "asd-asd",
      username: managerOrgAdminEmail,
      user: { connect: { id: managerOrgAdmin.id } },
      organization: { connect: { id: managerOrg.id } },
      movedFromUser: { connect: { id: managerOrgAdmin.id } },
    });

    managerOrgBilling = await platformBillingRepositoryFixture.create(managerOrg.id, "SCALE");

    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: managerOrgAdmin.id } },
      team: { connect: { id: managerOrg.id } },
      accepted: true,
    });

    const { keyString } = await apiKeysRepositoryFixture.createApiKey(
      managerOrgAdmin.id,
      null,
      managerOrg.id
    );
    managerOrgAdminApiKey = `cal_test_${keyString}`;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    advanceTo(newDate);

    await app.init();
  });

  afterAll(() => {
    clear();
  });

  it("should create managed organization", async () => {
    const suffix = randomString();

    const body: CreateOrganizationInput = {
      name: `organizations organizations org ${suffix}`,
      metadata: { key: "value" },
    };

    return request(app.getHttpServer())
      .post(`/v2/organizations/${managerOrg.id}/organizations`)
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .send(body)
      .expect(201)
      .then(async (response) => {
        const responseBody: ApiSuccessResponse<ManagedOrganizationWithApiKeyOutput> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        managedOrg = responseBody.data;
        expect(managedOrg?.id).toBeDefined();
        expect(managedOrg?.name).toEqual(body.name);
        expect(managedOrg?.metadata).toEqual(body.metadata);
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
        const profile = await profilesRepositoryFixture.findByOrgIdUserId(managedOrg.id, managerOrgAdmin.id);
        expect(profile).toBeDefined();
        expect(profile?.id).toBeDefined();
        expect(profile?.username).toEqual(managerOrgAdmin.username);
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
        const hashedApiKey = `${hashAPIKey(stripApiKey(managedOrg?.apiKey, apiKeyPrefix))}`;
        expect(managedOrgApiKeys?.[0]?.hashedKey).toEqual(hashedApiKey);
        const expectedExpiresAt = DateTime.fromJSDate(newDate).setZone("utc").plus({ days: 30 }).toJSDate();
        expect(managedOrgApiKeys?.[0]?.expiresAt).toEqual(expectedExpiresAt);
        expect(managedOrgApiKeys?.[0]?.note).toEqual(
          `Managed organization API key. ManagerOrgId: ${managerOrg.id}. ManagedOrgId: ${managedOrg.id}`
        );
        managedOrgApiKey = managedOrg?.apiKey;
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
        const responseBody: ApiSuccessResponse<ManagedOrganizationOutput[]> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const responseManagedOrgs = responseBody.data;
        expect(responseManagedOrgs?.length).toEqual(1);
        const responseManagedOrg = responseManagedOrgs[0];
        expect(responseManagedOrg?.id).toBeDefined();
        expect(responseManagedOrg?.name).toEqual(managedOrg.name);
        expect(responseManagedOrg?.metadata).toEqual(managedOrg.metadata);
      });
  });

  it("should update managed organization ", async () => {
    const suffix = randomString();

    const newOrgName = `new organizations organizations org ${suffix}`;

    return request(app.getHttpServer())
      .patch(`/v2/organizations/${managerOrg.id}/organizations/${managedOrg.id}`)
      .set("Authorization", `Bearer ${managerOrgAdminApiKey}`)
      .send({
        name: newOrgName,
      } satisfies UpdateOrganizationInput)
      .expect(200)
      .then(async (response) => {
        const responseBody: ApiSuccessResponse<ManagedOrganizationWithApiKeyOutput> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const responseManagedOrg = responseBody.data;
        expect(responseManagedOrg?.id).toBeDefined();
        expect(responseManagedOrg?.name).toEqual(newOrgName);

        const managedOrgInDb =
          await managedOrganizationsRepositoryFixture.getOrganizationWithManagedOrganizations(managedOrg.id);
        expect(managedOrgInDb).toBeDefined();
        expect(managedOrgInDb?.name).toEqual(newOrgName);

        managedOrg = { ...managedOrg, name: newOrgName };
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
        const hashedApiKey = `${hashAPIKey(stripApiKey(newApiKey, apiKeyPrefix))}`;
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

  it("should delete managed organization ", async () => {
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
    await organizationsRepositoryFixture.delete(managerOrg.id);
    await app.close();
  });
});
