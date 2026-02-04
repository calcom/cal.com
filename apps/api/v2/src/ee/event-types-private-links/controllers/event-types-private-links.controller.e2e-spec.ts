import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { CreatePrivateLinkInput } from "@calcom/platform-types";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Event Types Private Links Endpoints", () => {
  let app: INestApplication;

  let _oAuthClient: any;
  let organization: any;
  let userRepositoryFixture: UserRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let user: any;
  let eventType: any;

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

    organization = await teamRepositoryFixture.create({
      name: `private-links-organization-${randomString()}`,
      slug: `private-links-org-slug-${randomString()}`,
    });
    _oAuthClient = await createOAuthClient(organization.id);
    user = await userRepositoryFixture.create({
      email: userEmail,
      name: `private-links-user-${randomString()}`,
      username: `private-links-user-${randomString()}`,
    });

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
  });

  it("GET /v2/event-types/:eventTypeId/private-links - list private links", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v2/event-types/${eventType.id}/private-links`)
      .set("Authorization", `Bearer whatever`)
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("PATCH /v2/event-types/:eventTypeId/private-links/:linkId - update private link", async () => {
    // create a link first
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
    // cleanup created entities
    try {
      if (eventType?.id) {
        const repo = new EventTypesRepositoryFixture((app as any).select(AppModule));
        await repo.delete(eventType.id);
      }
    } catch {}
    await app.close();
  });
});
