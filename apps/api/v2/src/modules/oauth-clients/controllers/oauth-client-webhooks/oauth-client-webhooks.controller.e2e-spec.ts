import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { UserWithProfile } from "@/modules/users/users.repository";
import { CreateWebhookInputDto, UpdateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";
import {
  OAuthClientWebhooksOutputResponseDto,
  OAuthClientWebhookOutputResponseDto,
} from "@/modules/webhooks/outputs/oauth-client-webhook.output";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { PlatformBillingRepositoryFixture } from "test/fixtures/repository/billing.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { WebhookRepositoryFixture } from "test/fixtures/repository/webhooks.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import type { PlatformOAuthClient, Team, Webhook } from "@calcom/prisma/client";

describe("OAuth client WebhooksController (e2e)", () => {
  let app: INestApplication;
  const userEmail = `oauth-client-webhooks-user-${randomString()}@api.com`;
  const otherUserEmail = `oauth-client-webhooks-other-user-${randomString()}@api.com`;
  let user: UserWithProfile;
  let otherUser: UserWithProfile;
  let oAuthClient: PlatformOAuthClient;
  let otherOAuthClient: PlatformOAuthClient;
  let org: Team;
  let otherOrg: Team;
  let oAuthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let userRepositoryFixture: UserRepositoryFixture;
  let webhookRepositoryFixture: WebhookRepositoryFixture;
  let otherOAuthClientWebhook: Webhook;
  let membershipRepositoryFixture: MembershipRepositoryFixture;
  let profileRepositoryFixture: ProfileRepositoryFixture;
  let orgRepositoryFixture: OrganizationRepositoryFixture;
  let platformBillingRepositoryFixture: PlatformBillingRepositoryFixture;

  let webhook: OAuthClientWebhookOutputResponseDto["data"];

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      userEmail,
      Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, TokensModule],
      })
    ).compile();
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    webhookRepositoryFixture = new WebhookRepositoryFixture(moduleRef);
    oAuthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    orgRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
    platformBillingRepositoryFixture = new PlatformBillingRepositoryFixture(moduleRef);
    membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    user = await userRepositoryFixture.create({
      email: userEmail,
      username: userEmail,
    });
    otherUser = await userRepositoryFixture.create({
      email: otherUserEmail,
      username: otherUserEmail,
    });

    org = await orgRepositoryFixture.create({
      name: `oauth-client-webhooks-organization-${randomString()}`,
      isOrganization: true,
      metadata: {
        isOrganization: true,
        orgAutoAcceptEmail: "api.com",
        isOrganizationVerified: true,
        isOrganizationConfigured: true,
      },
      isPlatform: true,
    });
    otherOrg = await orgRepositoryFixture.create({
      name: `oauth-client-webhooks-other-organization-${randomString()}`,
      isOrganization: true,
      metadata: {
        isOrganization: true,
        orgAutoAcceptEmail: "api.com",
        isOrganizationVerified: true,
        isOrganizationConfigured: true,
      },
      isPlatform: true,
    });
    await platformBillingRepositoryFixture.create(org.id);
    await platformBillingRepositoryFixture.create(otherOrg.id);
    await membershipRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: user.id } },
      team: { connect: { id: org.id } },
      accepted: true,
    });
    await membershipRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: otherUser.id } },
      team: { connect: { id: otherOrg.id } },
      accepted: true,
    });

    await profileRepositoryFixture.create({
      uid: `usr-${user.id}`,
      username: userEmail,
      organization: {
        connect: {
          id: org.id,
        },
      },
      movedFromUser: {
        connect: {
          id: user.id,
        },
      },
      user: {
        connect: { id: user.id },
      },
    });
    await profileRepositoryFixture.create({
      uid: `usr-${otherUser.id}`,
      username: otherUserEmail,
      organization: {
        connect: {
          id: otherOrg.id,
        },
      },
      movedFromUser: {
        connect: {
          id: otherUser.id,
        },
      },
      user: {
        connect: { id: otherUser.id },
      },
    });

    const data = {
      logo: "logo-url",
      name: "name",
      redirectUris: ["redirect-uri"],
      permissions: 32,
    };
    const secret = "secret";
    oAuthClient = await oAuthClientRepositoryFixture.create(org.id, data, secret);
    otherOAuthClient = await oAuthClientRepositoryFixture.create(otherOrg.id, data, secret);
    otherOAuthClientWebhook = await webhookRepositoryFixture.create({
      id: "123abc-123abc-123abc-123abc",
      active: true,
      payloadTemplate: "string",
      subscriberUrl: "https://example.com",
      eventTriggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
      platformOAuthClient: { connect: { id: otherOAuthClient.id } },
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(user.email);
    await orgRepositoryFixture.delete(org.id);
    await userRepositoryFixture.deleteByEmail(otherUser.email);
    await orgRepositoryFixture.delete(otherOrg.id);
    await app.close();
  });

  it("/webhooks (POST)", () => {
    return request(app.getHttpServer())
      .post(`/v2/oauth-clients/${oAuthClient.id}/webhooks`)
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
            active: true,
            oAuthClientId: oAuthClient.id,
            payloadTemplate: "string",
            triggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
          },
        } satisfies OAuthClientWebhookOutputResponseDto);
        webhook = res.body.data;
      });
  });

  it("/oauth-clients/:oAuthClientId/webhooks/:webhookId (PATCH)", () => {
    return request(app.getHttpServer())
      .patch(`/v2/oauth-clients/${oAuthClient.id}/webhooks/${webhook.id}`)
      .send({
        active: false,
      } satisfies UpdateWebhookInputDto)
      .expect(200)
      .then((res) => {
        expect(res.body.data.active).toBe(false);
      });
  });

  it("/oauth-clients/:oAuthClientId/webhooks/:webhookId (GET)", () => {
    return request(app.getHttpServer())
      .get(`/v2/oauth-clients/${oAuthClient.id}/webhooks/${webhook.id}`)
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
            oAuthClientId: oAuthClient.id,
          },
        } satisfies OAuthClientWebhookOutputResponseDto);
      });
  });

  it("/oauth-clients/:oAuthClientId/webhooks/:webhookId (GET) should fail to get a webhook that does not exist", () => {
    return request(app.getHttpServer()).get(`/v2/oauth-clients/${oAuthClient.id}/webhooks/90284`).expect(404);
  });

  it("/webhooks (GET)", () => {
    return request(app.getHttpServer())
      .get(`/v2/oauth-clients/${oAuthClient.id}/webhooks`)
      .expect(200)
      .then((res) => {
        const responseBody = res.body as OAuthClientWebhooksOutputResponseDto;
        responseBody.data.forEach((webhook) => {
          expect(webhook.oAuthClientId).toBe(oAuthClient.id);
        });
      });
  });
  it("/webhooks (GET) should fail to get webhooks of OAuth client that doesn't belong to you", () => {
    return request(app.getHttpServer()).get(`/v2/oauth-clients/${otherOAuthClient.id}/webhooks`).expect(403);
  });

  it("/oauth-clients/:oAuthClientId/webhooks/:webhookId (DELETE)", () => {
    return request(app.getHttpServer())
      .delete(`/v2/oauth-clients/${oAuthClient.id}/webhooks/${webhook.id}`)
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
            oAuthClientId: oAuthClient.id,
          },
        } satisfies OAuthClientWebhookOutputResponseDto);
      });
  });

  it("/oauth-clients/:oAuthClientId/webhooks/:webhookId (DELETE) should fail to delete webhooks of an OAuth client that doesn't belong to you", () => {
    return request(app.getHttpServer())
      .delete(`/v2/oauth-clients/${otherOAuthClient.id}/webhooks/${otherOAuthClientWebhook.id}`)
      .expect(403);
  });

  it("/oauth-clients/:oAuthClientId/webhooks/:webhookId (DELETE) should fail to delete a webhook that does not exist", () => {
    return request(app.getHttpServer())
      .delete(`/v2/oauth-clients/${oAuthClient.id}/webhooks/1234453`)
      .expect(404);
  });
});
