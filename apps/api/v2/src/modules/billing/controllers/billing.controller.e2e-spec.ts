import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeService } from "@/modules/stripe/stripe.service";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { UserWithProfile } from "@/modules/users/users.repository";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import Stripe from "stripe";
import * as request from "supertest";
import { PlatformBillingRepositoryFixture } from "test/fixtures/repository/billing.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { Team, PlatformOAuthClient, PlatformBilling } from "@calcom/prisma/client";

describe("Platform Billing Controller (e2e)", () => {
  let app: INestApplication;
  const userEmail = `billing-user-${randomString()}@api.com`;
  let user: UserWithProfile;
  let billing: PlatformBilling;
  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let profileRepositoryFixture: ProfileRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let oAuthClient: PlatformOAuthClient;
  let platformBillingRepositoryFixture: PlatformBillingRepositoryFixture;
  let organization: Team;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      userEmail,
      Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, TokensModule],
      })
    ).compile();
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
    profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    platformBillingRepositoryFixture = new PlatformBillingRepositoryFixture(moduleRef);
    organization = await organizationsRepositoryFixture.create({
      name: `billing-organization-${randomString()}`,
    });

    user = await userRepositoryFixture.create({
      email: userEmail,
      username: userEmail,
    });

    await profileRepositoryFixture.create({
      uid: `usr-${user.id}`,
      username: userEmail,
      organization: {
        connect: {
          id: organization.id,
        },
      },
      user: {
        connect: {
          id: user.id,
        },
      },
    });
    await membershipsRepositoryFixture.create({
      role: "OWNER",
      team: { connect: { id: organization.id } },
      user: { connect: { id: user.id } },
      accepted: true,
    });

    billing = await platformBillingRepositoryFixture.create(organization.id);

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  afterAll(async () => {
    userRepositoryFixture.deleteByEmail(user.email);
    await app.close();
  });

  it("/billing/webhook (POST) should set billing free plan for org", () => {
    jest.spyOn(StripeService.prototype, "getStripe").mockImplementation(
      () =>
        ({
          webhooks: {
            constructEventAsync: async () => {
              return {
                type: "checkout.session.completed",
                data: {
                  object: {
                    metadata: {
                      teamId: organization.id,
                      plan: "FREE",
                    },
                    mode: "subscription",
                  },
                },
              };
            },
          },
        } as unknown as Stripe)
    );

    return request(app.getHttpServer())
      .post("/v2/billing/webhook")
      .set("stripe-signature", "t=1234567890,v1=random_signature_for_e2e_test")
      .expect(200)
      .then(async (res) => {
        const billing = await platformBillingRepositoryFixture.get(organization.id);
        expect(billing?.plan).toEqual("FREE");
      });
  });
  it("/billing/webhook (POST) failed payment should set billing free plan to overdue", () => {
    jest.spyOn(StripeService.prototype, "getStripe").mockImplementation(
      () =>
        ({
          webhooks: {
            constructEventAsync: async () => {
              return {
                type: "invoice.payment_failed",
                data: {
                  object: {
                    customer: billing?.customerId,
                    subscription: billing?.subscriptionId,
                  },
                },
              };
            },
          },
        } as unknown as Stripe)
    );
    return request(app.getHttpServer())
      .post("/v2/billing/webhook")
      .set("stripe-signature", "t=1234567890,v1=random_signature_for_e2e_test")
      .expect(200)
      .then(async (res) => {
        const billing = await platformBillingRepositoryFixture.get(organization.id);
        expect(billing?.overdue).toEqual(true);
      });
  });

  it("/billing/webhook (POST) success payment should set billing free plan to not overdue", () => {
    jest.spyOn(StripeService.prototype, "getStripe").mockImplementation(
      () =>
        ({
          webhooks: {
            constructEventAsync: async () => {
              return {
                type: "invoice.payment_succeeded",
                data: {
                  object: {
                    customer: billing?.customerId,
                    subscription: billing?.subscriptionId,
                  },
                },
              };
            },
          },
        } as unknown as Stripe)
    );

    return request(app.getHttpServer())
      .post("/v2/billing/webhook")
      .set("stripe-signature", "t=1234567890,v1=random_signature_for_e2e_test")
      .expect(200)
      .then(async (res) => {
        const billing = await platformBillingRepositoryFixture.get(organization.id);
        expect(billing?.overdue).toEqual(false);
      });
  });

  it("/billing/webhook (POST) should delete subscription", () => {
    jest.spyOn(StripeService.prototype, "getStripe").mockImplementation(
      () =>
        ({
          webhooks: {
            constructEventAsync: async () => {
              return {
                type: "customer.subscription.deleted",
                data: {
                  object: {
                    metadata: {
                      teamId: organization.id,
                      plan: "FREE",
                    },
                    id: billing?.subscriptionId,
                  },
                },
              };
            },
          },
        } as unknown as Stripe)
    );

    return request(app.getHttpServer())
      .post("/v2/billing/webhook")
      .set("stripe-signature", "t=1234567890,v1=random_signature_for_e2e_test")
      .expect(200)
      .then(async (res) => {
        const billing = await platformBillingRepositoryFixture.get(organization.id);
        expect(billing).toBeNull();
      });
  });
});
