import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { UserWithProfile } from "@/modules/users/users.repository";
import { CreateWebhookInputDto, UpdateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";
import {
  UserWebhookOutputResponseDto,
  UserWebhooksOutputResponseDto,
} from "@/modules/webhooks/outputs/user-webhook.output";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { WebhookRepositoryFixture } from "test/fixtures/repository/webhooks.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import type { Webhook } from "@calcom/prisma/client";

describe("WebhooksController (e2e)", () => {
  let app: INestApplication;
  const userEmail = `webhooks-controller-user-${randomString()}@api.com`;
  let user: UserWithProfile;
  let otherUser: UserWithProfile;

  let userRepositoryFixture: UserRepositoryFixture;
  let webhookRepositoryFixture: WebhookRepositoryFixture;

  let webhook: UserWebhookOutputResponseDto["data"];
  let otherWebhook: Webhook;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      userEmail,
      Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, TokensModule],
      })
    ).compile();
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    webhookRepositoryFixture = new WebhookRepositoryFixture(moduleRef);

    user = await userRepositoryFixture.create({
      email: userEmail,
      username: userEmail,
    });

    otherUser = await userRepositoryFixture.create({
      email: `webhooks-controller-other-user-${randomString()}@api.com`,
      username: `webhooks-controller-other-user-${randomString()}@api.com`,
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
    userRepositoryFixture.deleteByEmail(otherUser.email);
    webhookRepositoryFixture.delete(otherWebhook.id);
    await app.close();
  });

  it("/webhooks (POST)", () => {
    return request(app.getHttpServer())
      .post("/v2/webhooks")
      .send({
        subscriberUrl: "https://example.com",
        triggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
        active: true,
        payloadTemplate: "string",
      } satisfies CreateWebhookInputDto)
      .expect(201)
      .then(async (res) => {
        expect(res.body).toMatchObject({
          status: "success",
          data: {
            id: expect.any(String),
            subscriberUrl: "https://example.com",
            triggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
            active: true,
            payloadTemplate: "string",
            userId: user.id,
          },
        } satisfies UserWebhookOutputResponseDto);
        webhook = res.body.data;
      });
  });

  it("/webhooks (POST) should fail to create a webhook that already has same userId / subcriberUrl combo", () => {
    return request(app.getHttpServer())
      .post("/v2/webhooks")
      .send({
        subscriberUrl: "https://example.com",
        triggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
        active: true,
        payloadTemplate: "string",
      } satisfies CreateWebhookInputDto)
      .expect(409);
  });

  it("/webhooks/:webhookId (PATCH)", () => {
    return request(app.getHttpServer())
      .patch(`/v2/webhooks/${webhook.id}`)
      .send({
        active: false,
      } satisfies UpdateWebhookInputDto)
      .expect(200)
      .then((res) => {
        expect(res.body.data.active).toBe(false);
      });
  });

  it("/webhooks/:webhookId (GET)", () => {
    return request(app.getHttpServer())
      .get(`/v2/webhooks/${webhook.id}`)
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
            userId: user.id,
          },
        } satisfies UserWebhookOutputResponseDto);
      });
  });

  it("/webhooks/:webhookId (GET) should fail to get a webhook that does not exist", () => {
    return request(app.getHttpServer()).get(`/v2/webhooks/90284`).expect(404);
  });

  it("/webhooks/:webhookId (GET) should fail to get a webhook that does not belong to user", () => {
    return request(app.getHttpServer()).get(`/v2/webhooks/${otherWebhook.id}`).expect(403);
  });

  it("/webhooks (GET)", () => {
    return request(app.getHttpServer())
      .get("/v2/webhooks")
      .expect(200)
      .then((res) => {
        const responseBody = res.body as UserWebhooksOutputResponseDto;
        responseBody.data.forEach((webhook) => {
          expect(webhook.userId).toBe(user.id);
        });
      });
  });

  it("/webhooks/:webhookId (DELETE)", () => {
    return request(app.getHttpServer())
      .delete(`/v2/webhooks/${webhook.id}`)
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
            userId: user.id,
          },
        } satisfies UserWebhookOutputResponseDto);
      });
  });

  it("/webhooks/:webhookId (DELETE) should fail to delete a webhook that does not exist", () => {
    return request(app.getHttpServer()).delete(`/v2/webhooks/12993`).expect(404);
  });

  it("/webhooks/:webhookId (DELETE) should fail to delete a webhook that does not belong to user", () => {
    return request(app.getHttpServer()).delete(`/v2/webhooks/${otherWebhook.id}`).expect(403);
  });
});
