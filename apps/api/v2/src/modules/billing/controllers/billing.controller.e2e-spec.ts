import type { PlatformBilling, Team } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import Stripe from "stripe";
import request from "supertest";
import { PlatformBillingRepositoryFixture } from "test/fixtures/repository/billing.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CheckPlatformBillingResponseDto } from "@/modules/billing/controllers/outputs/CheckPlatformBillingResponse.dto";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeService } from "@/modules/stripe/stripe.service";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { UserWithProfile } from "@/modules/users/users.repository";

describe("Platform Billing Controller (e2e)", () => {
  let app: INestApplication;
  const userEmail = `billing-user-${randomString()}@api.com`;
  let user: UserWithProfile;
  let billing: PlatformBilling;
  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let profileRepositoryFixture: ProfileRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;
  let platformBillingRepositoryFixture: PlatformBillingRepositoryFixture;
  let organization: Team;
  let organization2: Team;

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
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    platformBillingRepositoryFixture = new PlatformBillingRepositoryFixture(moduleRef);

    organization = await organizationsRepositoryFixture.create({
      name: `billing-organization-${randomString()}`,
      isPlatform: true,
    });
    organization2 = await organizationsRepositoryFixture.create({
      name: `billing-organization-2-${randomString()}`,
      isPlatform: true,
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

  it("/billing/webhook (GET) should not get billing plan for org since it's not set yet", () => {
    return request(app.getHttpServer())
      .get(`/v2/billing/${organization.id}/check`)

      .expect(200)
      .then(async (res) => {
        const data = res.body.data as CheckPlatformBillingResponseDto;
        expect(data?.plan).toEqual("FREE");
      });
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
        }) as unknown as Stripe
    );

    return request(app.getHttpServer())
      .post("/v2/billing/webhook")
      .set("stripe-signature", "t=1234567890,v1=random_signature_for_e2e_test")
      .expect(200)
      .then(async (/* res */) => {
        const billing = await platformBillingRepositoryFixture.get(organization.id);
        expect(billing?.plan).toEqual("FREE");
      });
  });

  it("/billing/:orgId/check (GET) should check billing plan for org", () => {
    return request(app.getHttpServer())
      .get(`/v2/billing/${organization.id}/check`)
      .expect(200)
      .then(async (res) => {
        const data = res.body.data as CheckPlatformBillingResponseDto;
        expect(data?.plan).toEqual("FREE");
      });
  });

  it("/billing/:organizationId/check (GET) should not be able to check other org plan", () => {
    return request(app.getHttpServer()).get(`/v2/billing/${organization2.id}/check`).expect(403);
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
        }) as unknown as Stripe
    );
    return request(app.getHttpServer())
      .post("/v2/billing/webhook")
      .set("stripe-signature", "t=1234567890,v1=random_signature_for_e2e_test")
      .expect(200)
      .then(async (/* res */) => {
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
        }) as unknown as Stripe
    );

    return request(app.getHttpServer())
      .post("/v2/billing/webhook")
      .set("stripe-signature", "t=1234567890,v1=random_signature_for_e2e_test")
      .expect(200)
      .then(async (/* res */) => {
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
        }) as unknown as Stripe
    );

    return request(app.getHttpServer())
      .post("/v2/billing/webhook")
      .set("stripe-signature", "t=1234567890,v1=random_signature_for_e2e_test")
      .expect(200)
      .then(async (/* res */) => {
        const billing = await platformBillingRepositoryFixture.get(organization.id);
        expect(billing).toBeNull();
      });
  });
});
