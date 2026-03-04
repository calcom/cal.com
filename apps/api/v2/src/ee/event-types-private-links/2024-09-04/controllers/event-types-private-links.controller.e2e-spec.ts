import {
  CAL_API_VERSION_HEADER,
  EVENT_TYPE_READ,
  EVENT_TYPE_WRITE,
  SUCCESS_STATUS,
  VERSION_2024_09_04,
} from "@calcom/platform-constants";
import { getBookerBaseUrlSync } from "@calcom/platform-libraries/organizations";
import { CreatePrivateLinkInput } from "@calcom/platform-types";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { TokensRepositoryFixture } from "test/fixtures/repository/tokens.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Event Types Private Links Endpoints 2024-09-04", () => {
  jest.setTimeout(30000);

  let app: INestApplication;

  let accessToken: string;
  let organization: any;
  let userRepositoryFixture: UserRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let tokensRepositoryFixture: TokensRepositoryFixture;
  let user: any;
  let eventType: any;

  const userEmail = `private-links-v2-user-${randomString()}@api.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaExceptionFilter, HttpExceptionFilter],
      imports: [AppModule, UsersModule, EventTypesModule_2024_06_14, TokensModule],
    }).compile();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
    tokensRepositoryFixture = new TokensRepositoryFixture(moduleRef);

    organization = await teamRepositoryFixture.create({
      name: `private-links-v2-organization-${randomString()}`,
      slug: `private-links-v2-org-slug-${randomString()}`,
    });
    const oAuthClient = await createOAuthClient(organization.id);
    user = await userRepositoryFixture.create({
      email: userEmail,
      name: `private-links-v2-user-${randomString()}`,
      username: `private-links-v2-user-${randomString()}`,
    });

    const tokens = await tokensRepositoryFixture.createTokens(user.id, oAuthClient.id);
    accessToken = tokens.accessToken;

    eventType = await eventTypesRepositoryFixture.create(
      {
        title: `private-links-v2-event-type-${randomString()}`,
        slug: `private-links-v2-event-type-${randomString()}`,
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
      permissions: EVENT_TYPE_READ | EVENT_TYPE_WRITE,
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
      .set("Authorization", `Bearer ${accessToken}`)
      .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
      .send(body)
      .expect(201);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.linkId).toBeDefined();
    expect(response.body.data.eventTypeId).toBe(eventType.id);
    const expectedBaseUrl = getBookerBaseUrlSync(null).replace(/\/$/, "");
    expect(response.body.data.bookingUrl).toBe(
      `${expectedBaseUrl}/d/${response.body.data.linkId}/${eventType.slug}`
    );
    expect(response.body.data.maxUsageCount).toBe(5);
    expect(response.body.data.usageCount).toBeDefined();
  });

  it("GET /v2/event-types/:eventTypeId/private-links - list private links", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v2/event-types/${eventType.id}/private-links`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);

    const link = response.body.data[0];
    expect(link.linkId).toBeDefined();
    expect(link.eventTypeId).toBe(eventType.id);
    const expectedBaseUrl = getBookerBaseUrlSync(null).replace(/\/$/, "");
    expect(link.bookingUrl).toBe(`${expectedBaseUrl}/d/${link.linkId}/${eventType.slug}`);
    expect(link.isExpired).toBeDefined();
  });

  it("PATCH /v2/event-types/:eventTypeId/private-links/:linkId - update private link", async () => {
    const createResp = await request(app.getHttpServer())
      .post(`/api/v2/event-types/${eventType.id}/private-links`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
      .send({ maxUsageCount: 3 })
      .expect(201);

    const linkId = createResp.body.data.linkId;

    const response = await request(app.getHttpServer())
      .patch(`/api/v2/event-types/${eventType.id}/private-links/${linkId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
      .send({ maxUsageCount: 10 })
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.maxUsageCount).toBe(10);
    const expectedBaseUrl = getBookerBaseUrlSync(null).replace(/\/$/, "");
    expect(response.body.data.bookingUrl).toBe(`${expectedBaseUrl}/d/${linkId}/${eventType.slug}`);
    expect(response.body.data.eventTypeId).toBe(eventType.id);
  });

  it("DELETE /v2/event-types/:eventTypeId/private-links/:linkId - delete private link", async () => {
    const createResp = await request(app.getHttpServer())
      .post(`/api/v2/event-types/${eventType.id}/private-links`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
      .send({ maxUsageCount: 2 })
      .expect(201);

    const linkId = createResp.body.data.linkId;

    const response = await request(app.getHttpServer())
      .delete(`/api/v2/event-types/${eventType.id}/private-links/${linkId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.linkId).toBe(linkId);
  });

  afterAll(async () => {
    try {
      if (eventType?.id) {
        const repo = new EventTypesRepositoryFixture((app as any).select(AppModule));
        await repo.delete(eventType.id);
      }
    } catch {}
    await app.close();
  });
});
