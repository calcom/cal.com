import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_09_04 } from "@calcom/platform-constants";
import { getBookerBaseUrlSync } from "@calcom/platform-libraries/organizations";
import { CreatePrivateLinkInput } from "@calcom/platform-types";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { TokensRepositoryFixture } from "test/fixtures/repository/tokens.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Organizations / Teams / Event Types / Private Links Endpoints 2024-09-04", () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let accessToken: string;

  let orgFixture: OrganizationRepositoryFixture;
  let teamFixture: TeamRepositoryFixture;
  let userFixture: UserRepositoryFixture;
  let eventTypesFixture: EventTypesRepositoryFixture;
  let oauthClientFixture: OAuthClientRepositoryFixture;
  let tokensFixture: TokensRepositoryFixture;
  let membershipFixture: MembershipRepositoryFixture;

  let org: any;
  let team: any;
  let user: any;
  let eventType: any;

  const userEmail = `org-private-links-v2-user-${randomString()}@api.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaExceptionFilter, HttpExceptionFilter],
      imports: [AppModule, UsersModule, TokensModule],
    }).compile();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    orgFixture = new OrganizationRepositoryFixture(moduleRef);
    teamFixture = new TeamRepositoryFixture(moduleRef);
    userFixture = new UserRepositoryFixture(moduleRef);
    eventTypesFixture = new EventTypesRepositoryFixture(moduleRef);
    oauthClientFixture = new OAuthClientRepositoryFixture(moduleRef);
    tokensFixture = new TokensRepositoryFixture(moduleRef);
    membershipFixture = new MembershipRepositoryFixture(moduleRef);

    org = await orgFixture.create({
      name: `org-private-links-v2-org-${randomString()}`,
      slug: `org-private-links-v2-org-${randomString()}`,
      isOrganization: true,
    });

    user = await userFixture.create({
      email: userEmail,
      username: `org-private-links-v2-user-${randomString()}`,
      name: "Test User",
    });

    await membershipFixture.addUserToOrg(user, org, "ADMIN", true);

    const oAuthClient = await oauthClientFixture.create(org.id, {
      logo: "logo-url",
      name: "name",
      redirectUris: ["redirect-uri"],
      permissions: 32,
    }, "secret");

    const tokens = await tokensFixture.createTokens(user.id, oAuthClient.id);
    accessToken = tokens.accessToken;

    team = await teamFixture.create({
      name: `org-private-links-v2-team-${randomString()}`,
      isOrganization: false,
      parent: { connect: { id: org.id } },
    });

    eventType = await eventTypesFixture.createTeamEventType({
      title: `org-private-links-v2-event-type-${randomString()}`,
      slug: `org-private-links-v2-event-type-${randomString()}`,
      length: 30,
      locations: [],
      team: { connect: { id: team.id } },
    });

    await app.init();
  });

  it("POST /v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links - create", async () => {
    const body: CreatePrivateLinkInput = { maxUsageCount: 5 };
    const response = await request(app.getHttpServer())
      .post(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${eventType.id}/private-links`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
      .send(body)
      .expect(201);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.linkId).toBeDefined();
    expect(response.body.data.eventTypeId).toBe(eventType.id);
    const expectedBaseUrl = getBookerBaseUrlSync(org.slug).replace(/\/$/, "");
    expect(response.body.data.bookingUrl).toBe(
      `${expectedBaseUrl}/d/${response.body.data.linkId}/${eventType.slug}`
    );
    expect(response.body.data.maxUsageCount).toBe(5);
    expect(response.body.data.usageCount).toBeDefined();
  });

  it("GET /v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links - list", async () => {
    const response = await request(app.getHttpServer())
      .get(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${eventType.id}/private-links`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);

    const link = response.body.data[0];
    expect(link.linkId).toBeDefined();
    expect(link.eventTypeId).toBe(eventType.id);
    const expectedBaseUrl = getBookerBaseUrlSync(org.slug).replace(/\/$/, "");
    expect(link.bookingUrl).toBe(`${expectedBaseUrl}/d/${link.linkId}/${eventType.slug}`);
    expect(link.isExpired).toBeDefined();
  });

  it("PATCH /v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links/:linkId - update", async () => {
    const createResp = await request(app.getHttpServer())
      .post(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${eventType.id}/private-links`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
      .send({ maxUsageCount: 3 })
      .expect(201);

    const linkId = createResp.body.data.linkId as string;

    const response = await request(app.getHttpServer())
      .patch(
        `/v2/organizations/${org.id}/teams/${team.id}/event-types/${eventType.id}/private-links/${linkId}`
      )
      .set("Authorization", `Bearer ${accessToken}`)
      .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
      .send({ maxUsageCount: 10 })
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.maxUsageCount).toBe(10);
    const expectedBaseUrl = getBookerBaseUrlSync(org.slug).replace(/\/$/, "");
    expect(response.body.data.bookingUrl).toBe(`${expectedBaseUrl}/d/${linkId}/${eventType.slug}`);
    expect(response.body.data.eventTypeId).toBe(eventType.id);
  });

  it("DELETE /v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links/:linkId - delete", async () => {
    const createResp = await request(app.getHttpServer())
      .post(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${eventType.id}/private-links`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
      .send({ maxUsageCount: 2 })
      .expect(201);

    const linkId = createResp.body.data.linkId as string;

    const response = await request(app.getHttpServer())
      .delete(
        `/v2/organizations/${org.id}/teams/${team.id}/event-types/${eventType.id}/private-links/${linkId}`
      )
      .set("Authorization", `Bearer ${accessToken}`)
      .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.linkId).toBe(linkId);
  });

  afterAll(async () => {
    try {
      if (eventType?.id) {
        await eventTypesFixture.delete(eventType.id);
      }
      if (team?.id) {
        await teamFixture.delete(team.id);
      }
      if (org?.id) {
        await orgFixture.delete(org.id);
      }
      if (user?.email) {
        await userFixture.deleteByEmail(user.email);
      }
    } catch {}
    await app.close();
  });
});
