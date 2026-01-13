import type { EventType, Team, User, Webhook } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { WebhookRepositoryFixture } from "test/fixtures/repository/webhooks.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { CreateWebhookInputDto, UpdateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";
import {
  EventTypeWebhookOutputResponseDto,
  EventTypeWebhooksOutputResponseDto,
} from "@/modules/webhooks/outputs/event-type-webhook.output";
import { DeleteManyWebhooksOutputResponseDto } from "@/modules/webhooks/outputs/webhook.output";

describe("Teams EventTypes WebhooksController (e2e)", () => {
  let app: INestApplication;
  const userEmail = `teams-event-types-webhooks-user-${randomString()}@api.com`;
  let userAdmin: User;
  let otherUser: User;
  let team: Team;
  let otherTeam: Team;
  let teamEventType: EventType;
  let teamEventType2: EventType;
  let otherTeamEventType: EventType;

  let eventTypeRepositoryFixture: EventTypesRepositoryFixture;
  let userRepositoryFixture: UserRepositoryFixture;
  let webhookRepositoryFixture: WebhookRepositoryFixture;
  let teamsRepositoryFixture: TeamRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;

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
    teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

    userAdmin = await userRepositoryFixture.create({
      email: userEmail,
      username: userEmail,
    });

    otherUser = await userRepositoryFixture.create({
      email: `teams-event-types-webhooks-other-user-${randomString()}@api.com`,
      username: `teams-event-types-webhooks-other-user-${randomString()}@api.com`,
    });

    team = await teamsRepositoryFixture.create({
      name: `teams-event-types-webhooks-team-${randomString()}`,
      isOrganization: false,
    });

    otherTeam = await teamsRepositoryFixture.create({
      name: `teams-event-types-webhooks-other-team-${randomString()}`,
      isOrganization: false,
    });

    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: userAdmin.id } },
      team: { connect: { id: team.id } },
      accepted: true,
    });

    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: otherUser.id } },
      team: { connect: { id: otherTeam.id } },
      accepted: true,
    });

    teamEventType = await eventTypeRepositoryFixture.createTeamEventType({
      team: { connect: { id: team.id } },
      title: "Team Event Type 1",
      slug: `teams-event-types-webhooks-event-type-${randomString()}`,
      length: 60,
      schedulingType: "COLLECTIVE",
    });

    teamEventType2 = await eventTypeRepositoryFixture.createTeamEventType({
      team: { connect: { id: team.id } },
      title: "Team Event Type 2",
      slug: `teams-event-types-webhooks-event-type-${randomString()}`,
      length: 60,
      schedulingType: "COLLECTIVE",
    });

    otherTeamEventType = await eventTypeRepositoryFixture.createTeamEventType({
      team: { connect: { id: otherTeam.id } },
      title: "Other Team Event Type",
      slug: `teams-event-types-webhooks-other-event-type-${randomString()}`,
      length: 60,
      schedulingType: "COLLECTIVE",
    });

    otherWebhook = await webhookRepositoryFixture.create({
      id: `teams-webhooks-${randomString()}`,
      subscriberUrl: "https://example.com/other",
      eventTriggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
      active: true,
      payloadTemplate: "string",
      eventType: { connect: { id: otherTeamEventType.id } },
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(userAdmin.email);
    await userRepositoryFixture.deleteByEmail(otherUser.email);
    await webhookRepositoryFixture.delete(otherWebhook.id);
    await teamsRepositoryFixture.delete(team.id);
    await teamsRepositoryFixture.delete(otherTeam.id);
    await app.close();
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks (POST)", () => {
    return request(app.getHttpServer())
      .post(`/v2/teams/${team.id}/event-types/${teamEventType.id}/webhooks`)
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
            eventTypeId: teamEventType.id,
          },
        } satisfies EventTypeWebhookOutputResponseDto);
        webhook = res.body.data;
      });
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks (POST) - create webhook for second event type", () => {
    return request(app.getHttpServer())
      .post(`/v2/teams/${team.id}/event-types/${teamEventType2.id}/webhooks`)
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
            eventTypeId: teamEventType2.id,
          },
        } satisfies EventTypeWebhookOutputResponseDto);
      });
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks (POST) should fail to create a webhook for an event-type that does not belong to user's team", () => {
    return request(app.getHttpServer())
      .post(`/v2/teams/${otherTeam.id}/event-types/${otherTeamEventType.id}/webhooks`)
      .send({
        subscriberUrl: "https://example.com",
        triggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
        active: true,
        payloadTemplate: "string",
      } satisfies CreateWebhookInputDto)
      .expect(403);
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks/:webhookId (PATCH)", () => {
    return request(app.getHttpServer())
      .patch(`/v2/teams/${team.id}/event-types/${teamEventType.id}/webhooks/${webhook.id}`)
      .send({
        active: false,
      } satisfies UpdateWebhookInputDto)
      .expect(200)
      .then((res) => {
        expect(res.body.data.active).toBe(false);
      });
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks/:webhookId (PATCH) should fail to patch a webhook for an event-type that does not belong to user's team", () => {
    return request(app.getHttpServer())
      .patch(`/v2/teams/${otherTeam.id}/event-types/${otherTeamEventType.id}/webhooks/${otherWebhook.id}`)
      .send({
        active: false,
      } satisfies UpdateWebhookInputDto)
      .expect(403);
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks/:webhookId (GET)", () => {
    return request(app.getHttpServer())
      .get(`/v2/teams/${team.id}/event-types/${teamEventType.id}/webhooks/${webhook.id}`)
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
            eventTypeId: teamEventType.id,
          },
        } satisfies EventTypeWebhookOutputResponseDto);
      });
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks/:webhookId (GET) should fail to get a webhook that does not exist", () => {
    return request(app.getHttpServer())
      .get(`/v2/teams/${team.id}/event-types/${teamEventType.id}/webhooks/90284`)
      .expect(404);
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks/:webhookId (GET) should fail to get a webhook of an eventType that does not belong to user's team", () => {
    return request(app.getHttpServer())
      .get(`/v2/teams/${otherTeam.id}/event-types/${otherTeamEventType.id}/webhooks/${otherWebhook.id}`)
      .expect(403);
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks/:webhookId (GET) should fail to get a webhook that does not belong to the eventType", () => {
    return request(app.getHttpServer())
      .get(`/v2/teams/${team.id}/event-types/${teamEventType.id}/webhooks/${otherWebhook.id}`)
      .expect(403);
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks (GET)", () => {
    return request(app.getHttpServer())
      .get(`/v2/teams/${team.id}/event-types/${teamEventType.id}/webhooks`)
      .expect(200)
      .then((res) => {
        const responseBody = res.body as EventTypeWebhooksOutputResponseDto;
        responseBody.data.forEach((webhook) => {
          expect(webhook.eventTypeId).toBe(teamEventType.id);
        });
      });
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks (GET) - list webhooks for second event type", () => {
    return request(app.getHttpServer())
      .get(`/v2/teams/${team.id}/event-types/${teamEventType2.id}/webhooks`)
      .expect(200)
      .then((res) => {
        const responseBody = res.body as EventTypeWebhooksOutputResponseDto;
        responseBody.data.forEach((webhook) => {
          expect(webhook.eventTypeId).toBe(teamEventType2.id);
        });
      });
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks/:webhookId (DELETE)", () => {
    return request(app.getHttpServer())
      .delete(`/v2/teams/${team.id}/event-types/${teamEventType.id}/webhooks/${webhook.id}`)
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
            eventTypeId: teamEventType.id,
          },
        } satisfies EventTypeWebhookOutputResponseDto);
      });
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks (DELETE)", () => {
    return request(app.getHttpServer())
      .delete(`/v2/teams/${team.id}/event-types/${teamEventType2.id}/webhooks`)
      .expect(200)
      .then((res) => {
        expect(res.body).toMatchObject({
          status: "success",
          data: "1 webhooks deleted",
        } satisfies DeleteManyWebhooksOutputResponseDto);
      });
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks/:webhookId (DELETE) should fail to delete a webhook that does not exist", () => {
    return request(app.getHttpServer())
      .delete(`/v2/teams/${team.id}/event-types/${teamEventType.id}/webhooks/1234453`)
      .expect(404);
  });

  it("/teams/:teamId/event-types/:eventTypeId/webhooks/:webhookId (DELETE) should fail to delete a webhook that does not belong to user's team", () => {
    return request(app.getHttpServer())
      .delete(`/v2/teams/${otherTeam.id}/event-types/${otherTeamEventType.id}/webhooks/${otherWebhook.id}`)
      .expect(403);
  });
});
