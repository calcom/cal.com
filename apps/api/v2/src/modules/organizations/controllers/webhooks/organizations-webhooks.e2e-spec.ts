import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { UserWithProfile } from "@/modules/users/users.repository";
import { CreateWebhookInputDto, UpdateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";
import {
  TeamWebhookOutputResponseDto,
  TeamWebhooksOutputResponseDto,
} from "@/modules/webhooks/outputs/team-webhook.output";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { WebhookRepositoryFixture } from "test/fixtures/repository/webhooks.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { Team, Webhook } from "@calcom/prisma/client";

describe("WebhooksController (e2e)", () => {
  let app: INestApplication;
  const userEmail = "webhook-controller-e2e@api.com";
  let org: Team;

  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let webhookRepositoryFixture: WebhookRepositoryFixture;
  let userRepositoryFixture: UserRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;
  let webhook: TeamWebhookOutputResponseDto["data"];
  let otherWebhook: Webhook;
  let user: UserWithProfile;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      userEmail,
      Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, TokensModule],
      })
    ).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
    webhookRepositoryFixture = new WebhookRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

    user = await userRepositoryFixture.create({
      email: userEmail,
      username: userEmail,
    });

    org = await organizationsRepositoryFixture.create({
      name: "Test Organization",
      isOrganization: true,
    });

    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: user.id } },
      team: { connect: { id: org.id } },
    });

    otherWebhook = await webhookRepositoryFixture.create({
      id: "2mdfnn2",
      subscriberUrl: "https://example.com",
      eventTriggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
      active: true,
      payloadTemplate: "string",
    });
    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  afterAll(async () => {
    userRepositoryFixture.deleteByEmail(user.email);
    webhookRepositoryFixture.delete(otherWebhook.id);
    await app.close();
  });

  it("should be defined", () => {
    expect(userRepositoryFixture).toBeDefined();
    expect(user).toBeDefined();
    expect(org).toBeDefined();
  });

  it("/organizations/:orgId/webhooks (POST)", () => {
    return request(app.getHttpServer())
      .post(`/v2/organizations/${org.id}/webhooks`)
      .send({
        subscriberUrl: "https://example.com",
        triggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
        active: true,
        payloadTemplate: "string",
      } satisfies CreateWebhookInputDto)
      .expect(201)
      .then(async (res) => {
        process.stdout.write(JSON.stringify(res.body));
        expect(res.body).toMatchObject({
          status: "success",
          data: {
            id: expect.any(String),
            subscriberUrl: "https://example.com",
            triggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
            active: true,
            payloadTemplate: "string",
            teamId: org.id,
          },
        } satisfies TeamWebhookOutputResponseDto);
        webhook = res.body.data;
      });
  });

  it("/organizations/:orgId/webhooks (POST) should fail to create a webhook that already has same orgId / subcriberUrl combo", () => {
    return request(app.getHttpServer())
      .post(`/v2/organizations/${org.id}/webhooks`)
      .send({
        subscriberUrl: "https://example.com",
        triggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
        active: true,
        payloadTemplate: "string",
      } satisfies CreateWebhookInputDto)
      .expect(409);
  });

  it("/organizations/:orgId/webhooks/:webhookId (PATCH)", () => {
    return request(app.getHttpServer())
      .patch(`/v2/organizations/${org.id}/webhooks/${webhook.id}`)
      .send({
        active: false,
      } satisfies UpdateWebhookInputDto)
      .expect(200)
      .then((res) => {
        expect(res.body.data.active).toBe(false);
      });
  });

  it("/organizations/:orgId/webhooks/:webhookId (GET)", () => {
    return request(app.getHttpServer())
      .get(`/v2/organizations/${org.id}/webhooks/${webhook.id}`)
      .expect(200)
      .then((res) => {
        expect(res.body).toMatchObject({
          status: "success",
          data: {
            id: expect.any(String),
            subscriberUrl: "https://example.com",
            triggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
            active: false,
            payloadTemplate: "string",
            teamId: org.id,
          },
        } satisfies TeamWebhookOutputResponseDto);
      });
  });

  it("/organizations/:orgId/webhooks/:webhookId (GET) should say forbidden to get a webhook that does not exist", () => {
    return request(app.getHttpServer()).get(`/v2/organizations/${org.id}/webhooks/90284`).expect(403);
  });

  it("/organizations/:orgId/webhooks/:webhookId (GET) should fail to get a webhook that does not belong to org", () => {
    return request(app.getHttpServer())
      .get(`/v2/organizations/${org.id}/webhooks/${otherWebhook.id}`)
      .expect(403);
  });

  it("/organizations/:orgId/webhooks (GET)", () => {
    return request(app.getHttpServer())
      .get(`/v2/organizations/${org.id}/webhooks`)
      .expect(200)
      .then((res) => {
        const responseBody = res.body as TeamWebhooksOutputResponseDto;
        responseBody.data.forEach((webhook) => {
          expect(webhook.teamId).toBe(org.id);
        });
      });
  });

  it("/organizations/:orgId/webhooks/:webhookId (DELETE)", () => {
    return request(app.getHttpServer())
      .delete(`/v2/organizations/${org.id}/webhooks/${webhook.id}`)
      .expect(200)
      .then((res) => {
        expect(res.body).toMatchObject({
          status: "success",
          data: {
            id: expect.any(String),
            subscriberUrl: "https://example.com",
            triggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
            active: false,
            payloadTemplate: "string",
            teamId: org.id,
          },
        } satisfies TeamWebhookOutputResponseDto);
      });
  });

  it("/organizations/:orgId/webhooks/:webhookId (DELETE) shoud fail to delete a webhook that does not exist", () => {
    return request(app.getHttpServer()).delete(`/v2/organizations/${org.id}/webhooks/12993`).expect(403);
  });

  it("/organizations/:orgId/webhooks/:webhookId (DELETE) shoud fail to delete a webhook that does not belong to org", () => {
    return request(app.getHttpServer())
      .delete(`/v2/organizations/${org.id}/webhooks/${otherWebhook.id}`)
      .expect(403);
  });
});
