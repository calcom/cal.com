import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { Locales } from "@/lib/enums/locales";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import {
  CreateManagedUserData,
  CreateManagedUserOutput,
} from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/create-managed-user.output";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { CreatePrivateLinkInput } from "@calcom/platform-types";
import type { PlatformOAuthClient, Team, User } from "@calcom/prisma/client";

describe("Event Types Private Links Endpoints", () => {
  let app: INestApplication;

  let organization: { id: number; name: string; slug: string };
  let userRepositoryFixture: UserRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let user: { id: number; email: string; name: string; username: string };
  let eventType: { id: number; title: string; slug: string; length: number };

  const userEmail = `private-links-user-${randomString()}@api.com`;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      userEmail,
      Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter],
        imports: [AppModule, UsersModule, EventTypesModule_2024_06_14, TokensModule],
      })
    )
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

    organization = (await teamRepositoryFixture.create({
      name: `private-links-organization-${randomString()}`,
      slug: `private-links-org-slug-${randomString()}`,
    })) as { id: number; name: string; slug: string };
    await createOAuthClient(organization.id);
    user = (await userRepositoryFixture.create({
      email: userEmail,
      name: `private-links-user-${randomString()}`,
      username: `private-links-user-${randomString()}`,
    })) as { id: number; email: string; name: string; username: string };

    // create an event type owned by user
    eventType = await eventTypesRepositoryFixture.create(
      {
        title: `private-links-event-type-${randomString()}`,
        slug: `private-links-event-type-${randomString()}`,
        length: 30,
        locations: [],
      },
      user.id
    );

    await app.init();
  });

  async function createOAuthClient(organizationId: number) {
    const data = {
      logo: "logo-url",
      name: "name",
      redirectUris: ["redirect-uri"],
      permissions: 32,
    };
    const secret = "secret";

    const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
    return client;
  }

  it("POST /v2/event-types/:eventTypeId/private-links - create private link", async () => {
    const body: CreatePrivateLinkInput = {
      expiresAt: undefined,
      maxUsageCount: 5,
    };

    const response = await request(app.getHttpServer())
      .post(`/api/v2/event-types/${eventType.id}/private-links`)
      .set("Authorization", `Bearer whatever`)
      .send(body)
      .expect(201);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.linkId).toBeDefined();
    expect(response.body.data.maxUsageCount).toBe(5);
    expect(response.body.data.usageCount).toBeDefined();

    const baseUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || "https://app.cal.com";
    const linkId = response.body.data.linkId;
    const expectedUrl = `${baseUrl}/d/${linkId}/${eventType.slug}`;
    expect(response.body.data.bookingUrl).toBe(expectedUrl);
  });

  it("GET /v2/event-types/:eventTypeId/private-links - list private links", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v2/event-types/${eventType.id}/private-links`)
      .set("Authorization", `Bearer whatever`)
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);

    const baseUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || "https://app.cal.com";
    response.body.data.forEach((link: { bookingUrl: string; linkId: string }) => {
      expect(link.bookingUrl).toBeDefined();
      expect(link.bookingUrl).toContain(`${baseUrl}/d/`);
      expect(link.bookingUrl).toContain(`/${eventType.slug}`);
    });
  });

  it("PATCH /v2/event-types/:eventTypeId/private-links/:linkId - update private link", async () => {
    const createResp = await request(app.getHttpServer())
      .post(`/api/v2/event-types/${eventType.id}/private-links`)
      .set("Authorization", `Bearer whatever`)
      .send({ maxUsageCount: 3 })
      .expect(201);

    const linkId = createResp.body.data.linkId;

    const response = await request(app.getHttpServer())
      .patch(`/api/v2/event-types/${eventType.id}/private-links/${linkId}`)
      .set("Authorization", `Bearer whatever`)
      .send({ maxUsageCount: 10 })
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.maxUsageCount).toBe(10);

    const baseUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || "https://app.cal.com";
    const expectedUrl = `${baseUrl}/d/${linkId}/${eventType.slug}`;
    expect(response.body.data.bookingUrl).toBe(expectedUrl);
  });

  it("DELETE /v2/event-types/:eventTypeId/private-links/:linkId - delete private link", async () => {
    // create a link to delete
    const createResp = await request(app.getHttpServer())
      .post(`/api/v2/event-types/${eventType.id}/private-links`)
      .set("Authorization", `Bearer whatever`)
      .send({ maxUsageCount: 2 })
      .expect(201);

    const linkId = createResp.body.data.linkId;

    const response = await request(app.getHttpServer())
      .delete(`/api/v2/event-types/${eventType.id}/private-links/${linkId}`)
      .set("Authorization", `Bearer whatever`)
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.linkId).toBe(linkId);
  });

  afterAll(async () => {
    try {
      if (eventType?.id) {
        await eventTypesRepositoryFixture.delete(eventType.id);
      }
    } catch (error) {
      console.error("Error cleaning up test data:", error);
    }
    await app.close();
  });
});

describe("Event Types Private Links - Managed User Restrictions", () => {
  let app: INestApplication;

  let oAuthClient: PlatformOAuthClient;
  let platformOrganization: Team;
  let userRepositoryFixture: UserRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let profilesRepositoryFixture: ProfileRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;

  let platformAdmin: User;
  const platformAdminEmail = `private-links-managed-user-admin-${randomString()}@api.com`;

  let managedUser: CreateManagedUserData;
  const managedUserEmail = `private-links-managed-user-${randomString()}@api.com`;

  let managedUserEventType: { id: number; slug: string };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaExceptionFilter, HttpExceptionFilter],
      imports: [AppModule, UsersModule, MembershipsModule, EventTypesModule_2024_06_14, TokensModule],
    }).compile();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
    profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

    platformAdmin = await userRepositoryFixture.create({ email: platformAdminEmail });

    platformOrganization = await teamRepositoryFixture.create({
      name: `private-links-platform-org-${randomString()}`,
      isPlatform: true,
      isOrganization: true,
      platformBilling: {
        create: {
          customerId: `cus_private_links_${randomString()}`,
          plan: "SCALE",
          subscriptionId: `sub_private_links_${randomString()}`,
        },
      },
    });

    oAuthClient = await createOAuthClient(platformOrganization.id);

    await profilesRepositoryFixture.create({
      uid: `private-links-profile-${randomString()}`,
      username: platformAdminEmail,
      organization: { connect: { id: platformOrganization.id } },
      user: { connect: { id: platformAdmin.id } },
    });

    await membershipsRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: platformAdmin.id } },
      team: { connect: { id: platformOrganization.id } },
      accepted: true,
    });

    await app.init();
  });

  async function createOAuthClient(organizationId: number) {
    const data = {
      logo: "logo-url",
      name: "private-links-oauth-client",
      redirectUris: ["http://localhost:4321"],
      permissions: 1023,
    };
    const secret = "secret";

    const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
    return client;
  }

  it("should create a managed user", async () => {
    const requestBody: CreateManagedUserInput = {
      email: managedUserEmail,
      timeZone: "Europe/London",
      weekStart: "Monday",
      timeFormat: 24,
      locale: Locales.EN,
      name: "Managed User",
    };

    const response = await request(app.getHttpServer())
      .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
      .set("x-cal-secret-key", oAuthClient.secret)
      .send(requestBody)
      .expect(201);

    const responseBody: CreateManagedUserOutput = response.body;
    expect(responseBody.status).toEqual(SUCCESS_STATUS);
    expect(responseBody.data).toBeDefined();
    expect(responseBody.data.accessToken).toBeDefined();

    managedUser = responseBody.data;
  });

  it("should create an event type for managed user", async () => {
    managedUserEventType = await eventTypesRepositoryFixture.create(
      {
        title: `private-links-managed-user-event-type-${randomString()}`,
        slug: `private-links-managed-user-event-type-${randomString()}`,
        length: 30,
        locations: [],
      },
      managedUser.user.id
    );
  });

  it("POST /v2/event-types/:eventTypeId/private-links - managed user should be forbidden from creating private links", async () => {
    const body: CreatePrivateLinkInput = {
      maxUsageCount: 5,
    };

    const response = await request(app.getHttpServer())
      .post(`/api/v2/event-types/${managedUserEventType.id}/private-links`)
      .set("Authorization", `Bearer ${managedUser.accessToken}`)
      .send(body)
      .expect(403);

    expect(response.body.message).toContain("Managed users cannot create private links");
  });

  it("GET /v2/event-types/:eventTypeId/private-links - managed user should be forbidden from listing private links", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v2/event-types/${managedUserEventType.id}/private-links`)
      .set("Authorization", `Bearer ${managedUser.accessToken}`)
      .expect(403);

    expect(response.body.message).toContain("Managed users cannot create private links");
  });

  afterAll(async () => {
    try {
      if (managedUserEventType?.id) {
        await eventTypesRepositoryFixture.delete(managedUserEventType.id);
      }
    } catch (error) {
      console.error("Error cleaning up test data:", error);
    }
    if (app) {
      await app.close();
    }
  });
});
