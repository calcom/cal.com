import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { CreatePrivateLinkInput } from "@calcom/platform-types";

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

    const baseUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || "https://cal.com";
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

    const baseUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || "https://cal.com";
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

    const baseUrl = process.env.NEXT_PUBLIC_WEBAPP_URL || "https://cal.com";
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
