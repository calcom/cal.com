import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
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

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { CreatePrivateLinkInput } from "@calcom/platform-types";
import type { PlatformOAuthClient, Team, User, EventType } from "@calcom/prisma/client";

describe("Organizations Event Types Private Links - Platform Org Restrictions", () => {
  let app: INestApplication;

  let oAuthClient: PlatformOAuthClient;
  let platformOrganization: Team;
  let platformTeam: Team;
  let userRepositoryFixture: UserRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let profilesRepositoryFixture: ProfileRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;

  let platformAdmin: User;
  const platformAdminEmail = `private-links-platform-org-admin-${randomString()}@api.com`;

  let teamEventType: EventType;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaExceptionFilter, HttpExceptionFilter],
      imports: [AppModule, UsersModule, MembershipsModule],
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
      name: `private-links-platform-org-test-${randomString()}`,
      slug: `private-links-platform-org-test-${randomString()}`,
      isPlatform: true,
      isOrganization: true,
      platformBilling: {
        create: {
          customerId: `cus_platform_org_${randomString()}`,
          plan: "SCALE",
          subscriptionId: `sub_platform_org_${randomString()}`,
        },
      },
      organizationSettings: {
        create: { isAdminAPIEnabled: true, orgAutoAcceptEmail: "example.com" },
      },
    });

    platformTeam = await teamRepositoryFixture.create({
      name: `private-links-platform-team-${randomString()}`,
      slug: `private-links-platform-team-${randomString()}`,
      parent: { connect: { id: platformOrganization.id } },
    });

    oAuthClient = await createOAuthClient(platformOrganization.id);

    await profilesRepositoryFixture.create({
      uid: `private-links-platform-profile-${randomString()}`,
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

    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: platformAdmin.id } },
      team: { connect: { id: platformTeam.id } },
      accepted: true,
    });

    teamEventType = await eventTypesRepositoryFixture.createTeamEventType({
      schedulingType: "ROUND_ROBIN",
      team: { connect: { id: platformTeam.id } },
      title: `private-links-platform-team-event-type-${randomString()}`,
      slug: `private-links-platform-team-event-type-${randomString()}`,
      length: 30,
    });

    await app.init();
  });

  async function createOAuthClient(organizationId: number) {
    const data = {
      logo: "logo-url",
      name: "private-links-platform-oauth-client",
      redirectUris: ["http://localhost:4321"],
      permissions: 1023,
    };
    const secret = "secret";

    const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
    return client;
  }

  it("POST /v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links - platform org should be forbidden from creating private links", async () => {
    const body: CreatePrivateLinkInput = {
      maxUsageCount: 5,
    };

    const response = await request(app.getHttpServer())
      .post(
        `/api/v2/organizations/${platformOrganization.id}/teams/${platformTeam.id}/event-types/${teamEventType.id}/private-links`
      )
      .set("x-cal-client-id", oAuthClient.id)
      .set("x-cal-secret-key", oAuthClient.secret)
      .send(body)
      .expect(403);

    expect(response.body.error.message).toContain(
      "Platform organizations are not permitted to perform this action"
    );
  });

  it("GET /v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links - platform org should be forbidden from listing private links", async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/v2/organizations/${platformOrganization.id}/teams/${platformTeam.id}/event-types/${teamEventType.id}/private-links`
      )
      .set("x-cal-client-id", oAuthClient.id)
      .set("x-cal-secret-key", oAuthClient.secret)
      .expect(403);

    expect(response.body.error.message).toContain(
      "Platform organizations are not permitted to perform this action"
    );
  });

  afterAll(async () => {
    try {
      if (teamEventType?.id) {
        await eventTypesRepositoryFixture.delete(teamEventType.id);
      }
    } catch (error) {
      console.error("Error cleaning up test data:", error);
    }
    if (app) {
      await app.close();
    }
  });
});

describe("Organizations Event Types Private Links - Regular Org Can Create Private Links", () => {
  let app: INestApplication;

  let oAuthClient: PlatformOAuthClient;
  let regularOrganization: Team;
  let regularTeam: Team;
  let userRepositoryFixture: UserRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let profilesRepositoryFixture: ProfileRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;

  let orgAdmin: User;
  const orgAdminEmail = `private-links-regular-org-admin-${randomString()}@api.com`;

  let teamEventType: EventType;
  let createdLinkId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaExceptionFilter, HttpExceptionFilter],
      imports: [AppModule, UsersModule, MembershipsModule],
    }).compile();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
    profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

    orgAdmin = await userRepositoryFixture.create({ email: orgAdminEmail });

    // Create a regular organization (isPlatform = false)
    regularOrganization = await teamRepositoryFixture.create({
      name: `private-links-regular-org-test-${randomString()}`,
      slug: `private-links-regular-org-test-${randomString()}`,
      isPlatform: false,
      isOrganization: true,
      organizationSettings: {
        create: { isAdminAPIEnabled: true, orgAutoAcceptEmail: "example.com" },
      },
    });

    regularTeam = await teamRepositoryFixture.create({
      name: `private-links-regular-team-${randomString()}`,
      slug: `private-links-regular-team-${randomString()}`,
      parent: { connect: { id: regularOrganization.id } },
    });

    oAuthClient = await createOAuthClient(regularOrganization.id);

    await profilesRepositoryFixture.create({
      uid: `private-links-regular-profile-${randomString()}`,
      username: orgAdminEmail,
      organization: { connect: { id: regularOrganization.id } },
      user: { connect: { id: orgAdmin.id } },
    });

    await membershipsRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: orgAdmin.id } },
      team: { connect: { id: regularOrganization.id } },
      accepted: true,
    });

    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: orgAdmin.id } },
      team: { connect: { id: regularTeam.id } },
      accepted: true,
    });

    teamEventType = await eventTypesRepositoryFixture.createTeamEventType({
      schedulingType: "ROUND_ROBIN",
      team: { connect: { id: regularTeam.id } },
      title: `private-links-regular-team-event-type-${randomString()}`,
      slug: `private-links-regular-team-event-type-${randomString()}`,
      length: 30,
    });

    await app.init();
  });

  async function createOAuthClient(organizationId: number) {
    const data = {
      logo: "logo-url",
      name: "private-links-regular-oauth-client",
      redirectUris: ["http://localhost:4321"],
      permissions: 1023,
    };
    const secret = "secret";

    const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
    return client;
  }

  it("POST /v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links - regular org should be able to create private links", async () => {
    const body: CreatePrivateLinkInput = {
      maxUsageCount: 5,
    };

    const response = await request(app.getHttpServer())
      .post(
        `/api/v2/organizations/${regularOrganization.id}/teams/${regularTeam.id}/event-types/${teamEventType.id}/private-links`
      )
      .set("x-cal-client-id", oAuthClient.id)
      .set("x-cal-secret-key", oAuthClient.secret)
      .send(body)
      .expect(201);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.linkId).toBeDefined();
    expect(response.body.data.maxUsageCount).toBe(5);
    expect(response.body.data.bookingUrl).toBeDefined();
    expect(response.body.data.bookingUrl).toContain("/d/");
    expect(response.body.data.bookingUrl).toContain(`/${teamEventType.slug}`);

    createdLinkId = response.body.data.linkId;
  });

  it("GET /v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links - regular org should be able to list private links", async () => {
    const response = await request(app.getHttpServer())
      .get(
        `/api/v2/organizations/${regularOrganization.id}/teams/${regularTeam.id}/event-types/${teamEventType.id}/private-links`
      )
      .set("x-cal-client-id", oAuthClient.id)
      .set("x-cal-secret-key", oAuthClient.secret)
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);

    const link = response.body.data.find((l: { linkId: string }) => l.linkId === createdLinkId);
    expect(link).toBeDefined();
    expect(link.bookingUrl).toContain("/d/");
    expect(link.bookingUrl).toContain(`/${teamEventType.slug}`);
  });

  it("PATCH /v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links/:linkId - regular org should be able to update private links", async () => {
    const response = await request(app.getHttpServer())
      .patch(
        `/api/v2/organizations/${regularOrganization.id}/teams/${regularTeam.id}/event-types/${teamEventType.id}/private-links/${createdLinkId}`
      )
      .set("x-cal-client-id", oAuthClient.id)
      .set("x-cal-secret-key", oAuthClient.secret)
      .send({ maxUsageCount: 10 })
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.maxUsageCount).toBe(10);
    expect(response.body.data.bookingUrl).toContain("/d/");
    expect(response.body.data.bookingUrl).toContain(`/${teamEventType.slug}`);
  });

  it("DELETE /v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links/:linkId - regular org should be able to delete private links", async () => {
    const response = await request(app.getHttpServer())
      .delete(
        `/api/v2/organizations/${regularOrganization.id}/teams/${regularTeam.id}/event-types/${teamEventType.id}/private-links/${createdLinkId}`
      )
      .set("x-cal-client-id", oAuthClient.id)
      .set("x-cal-secret-key", oAuthClient.secret)
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.linkId).toBe(createdLinkId);
  });

  afterAll(async () => {
    try {
      if (teamEventType?.id) {
        await eventTypesRepositoryFixture.delete(teamEventType.id);
      }
    } catch (error) {
      console.error("Error cleaning up test data:", error);
    }
    if (app) {
      await app.close();
    }
  });
});
