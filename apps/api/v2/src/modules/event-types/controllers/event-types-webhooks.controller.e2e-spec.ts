import type { EventType, Webhook } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { WebhookRepositoryFixture } from "test/fixtures/repository/webhooks.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { UserWithProfile } from "@/modules/users/users.repository";
import { CreateWebhookInputDto, UpdateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";
import {
  EventTypeWebhookOutputResponseDto,
  EventTypeWebhooksOutputResponseDto,
} from "@/modules/webhooks/outputs/event-type-webhook.output";
import { DeleteManyWebhooksOutputResponseDto } from "@/modules/webhooks/outputs/webhook.output";

describe("EventTypes WebhooksController (e2e)", () => {
  let app: INestApplication;
  const userEmail = `event-types-webhooks-user-${randomString()}@api.com`;
  let user: UserWithProfile;
  let otherUser: UserWithProfile;
  let eventType: EventType;
  let eventType2: EventType;
  let otherEventType: EventType;

  let eventTypeRepositoryFixture: EventTypesRepositoryFixture;
  let userRepositoryFixture: UserRepositoryFixture;
  let webhookRepositoryFixture: WebhookRepositoryFixture;

  let webhook: EventTypeWebhookOutputResponseDto["data"];
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
    eventTypeRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

    user = await userRepositoryFixture.create({
      email: userEmail,
      username: userEmail,
    });

    otherUser = await userRepositoryFixture.create({
      email: `event-types-webhooks-other-user-${randomString()}@api.com`,
      username: `event-types-webhooks-other-user-${randomString()}@api.com`,
    });

    eventType = await eventTypeRepositoryFixture.create(
      {
        title: "Event Type 1",
        slug: `event-types-webhooks-event-type-${randomString()}`,
        length: 60,
      },
      user.id
    );

    eventType2 = await eventTypeRepositoryFixture.create(
      {
        title: "Event Type 2",
        slug: `event-types-webhooks-event-type-${randomString()}`,
        length: 60,
      },
      user.id
    );

    otherEventType = await eventTypeRepositoryFixture.create(
      {
        title: "Other Event Type ",
        slug: `event-types-webhooks-other-event-type-${randomString()}`,
        length: 60,
      },
      otherUser.id
    );

    otherWebhook = await webhookRepositoryFixture.create({
      id: "2mdfnn24",
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
      .post(`/v2/event-types/${eventType.id}/webhooks`)
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
            eventTypeId: eventType.id,
          },
        } satisfies EventTypeWebhookOutputResponseDto);
        webhook = res.body.data;
      });
  });

  it("/webhooks (POST)", () => {
    return request(app.getHttpServer())
      .post(`/v2/event-types/${eventType2.id}/webhooks`)
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
            eventTypeId: eventType2.id,
          },
        } satisfies EventTypeWebhookOutputResponseDto);
        //webhook2 = res.body.data;
      });
  });

  it("/webhooks (POST) should fail to create a webhook for an event-type that does not belong to user", () => {
    return request(app.getHttpServer())
      .post(`/v2/event-types/${otherEventType.id}/webhooks`)
      .send({
        subscriberUrl: "https://example.com",
        triggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
        active: true,
        payloadTemplate: "string",
      } satisfies CreateWebhookInputDto)
      .expect(403);
  });

  it("/event-types/:eventTypeId/webhooks/:webhookId (PATCH)", () => {
    return request(app.getHttpServer())
      .patch(`/v2/event-types/${eventType.id}/webhooks/${webhook.id}`)
      .send({
        active: false,
      } satisfies UpdateWebhookInputDto)
      .expect(200)
      .then((res) => {
        expect(res.body.data.active).toBe(false);
      });
  });

  it("/event-types/:eventTypeId/webhooks/:webhookId (PATCH) should fail to patch a webhook for an event-type that does not belong to user", () => {
    return request(app.getHttpServer())
      .patch(`/v2/event-types/${otherEventType.id}/webhooks/${otherWebhook.id}`)
      .send({
        active: false,
      } satisfies UpdateWebhookInputDto)
      .expect(403);
  });

  it("/event-types/:eventTypeId/webhooks/:webhookId (GET)", () => {
    return request(app.getHttpServer())
      .get(`/v2/event-types/${eventType.id}/webhooks/${webhook.id}`)
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
            eventTypeId: eventType.id,
          },
        } satisfies EventTypeWebhookOutputResponseDto);
      });
  });

  it("/event-types/:eventTypeId/webhooks/:webhookId (GET) should fail to get a webhook that does not exist", () => {
    return request(app.getHttpServer()).get(`/v2/event-types/${eventType.id}/webhooks/90284`).expect(404);
  });

  it("/event-types/:eventTypeId/webhooks/:webhookId (GET) should fail to get a webhook of an eventType that does not belong to user", () => {
    return request(app.getHttpServer())
      .get(`/v2/event-types/${otherEventType.id}/webhooks/${otherWebhook.id}`)
      .expect(403);
  });

  it("/event-types/:eventTypeId/webhooks/:webhookId (GET) should fail to get a webhook that does not belong to the eventType", () => {
    return request(app.getHttpServer())
      .get(`/v2/event-types/${eventType.id}/webhooks/${otherWebhook.id}`)
      .expect(400);
  });

  it("/webhooks (GET)", () => {
    return request(app.getHttpServer())
      .get(`/v2/event-types/${eventType.id}/webhooks`)
      .expect(200)
      .then((res) => {
        const responseBody = res.body as EventTypeWebhooksOutputResponseDto;
        responseBody.data.forEach((webhook) => {
          expect(webhook.eventTypeId).toBe(eventType.id);
        });
      });
  });

  it("/event-types/:eventTypeId/webhooks (GET)", () => {
    return request(app.getHttpServer())
      .get(`/v2/event-types/${eventType2.id}/webhooks`)
      .expect(200)
      .then((res) => {
        const responseBody = res.body as EventTypeWebhooksOutputResponseDto;
        responseBody.data.forEach((webhook) => {
          expect(webhook.eventTypeId).toBe(eventType2.id);
        });
      });
  });

  it("/event-types/:eventTypeId/webhooks/:webhookId (DELETE)", () => {
    return request(app.getHttpServer())
      .delete(`/v2/event-types/${eventType.id}/webhooks/${webhook.id}`)
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
            eventTypeId: eventType.id,
          },
        } satisfies EventTypeWebhookOutputResponseDto);
      });
  });

  it("/event-types/:eventTypeId/webhooks (DELETE)", () => {
    return request(app.getHttpServer())
      .delete(`/v2/event-types/${eventType2.id}/webhooks`)
      .expect(200)
      .then((res) => {
        expect(res.body).toMatchObject({
          status: "success",
          data: "1 webhooks deleted",
        } satisfies DeleteManyWebhooksOutputResponseDto);
      });
  });

  it("/event-types/:eventTypeId/webhooks/:webhookId (DELETE) should fail to delete a webhook that does not exist", () => {
    return request(app.getHttpServer())
      .delete(`/v2/event-types/${eventType.id}/webhooks/1234453`)
      .expect(404);
  });

  it("/event-types/:eventTypeId/webhooks/:webhookId (DELETE) should fail to delete a webhook that does not belong to user", () => {
    return request(app.getHttpServer())
      .delete(`/v2/event-types/${otherEventType.id}/webhooks/${otherWebhook.id}`)
      .expect(403);
  });
});
