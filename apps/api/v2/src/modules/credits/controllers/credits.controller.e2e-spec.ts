import type { User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CreditsService } from "@/modules/credits/services/credits.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Credits Controller (e2e)", () => {
  let app: INestApplication;
  let userRepositoryFixture: UserRepositoryFixture;
  let user: User;
  const userEmail = `credits-controller-e2e-${randomString()}@api.com`;

  let mockCreditsService: {
    getAvailableCredits: jest.Mock;
    chargeCredits: jest.Mock;
  };

  beforeAll(async () => {
    mockCreditsService = {
      getAvailableCredits: jest.fn().mockResolvedValue({
        hasCredits: true,
        balance: {
          monthlyRemaining: 450,
          additional: 200,
        },
      }),
      chargeCredits: jest.fn().mockResolvedValue({
        charged: true,
        teamId: 1,
        remainingBalance: {
          monthlyRemaining: 445,
          additional: 200,
        },
      }),
    };

    const moduleRef = await withApiAuth(
      userEmail,
      Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, TokensModule],
      })
    )
      .overrideProvider(CreditsService)
      .useValue(mockCreditsService)
      .compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);

    user = await userRepositoryFixture.create({
      email: userEmail,
      username: userEmail,
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  describe("GET /v2/credits/available", () => {
    it("should return available credits for authenticated user", () => {
      return request(app.getHttpServer())
        .get("/v2/credits/available")
        .set({ Authorization: "Bearer fake" })
        .expect(200)
        .then((res) => {
          expect(res.body.status).toEqual("success");
          expect(res.body.data).toBeDefined();
          expect(res.body.data.hasCredits).toBe(true);
          expect(res.body.data.balance).toBeDefined();
          expect(res.body.data.balance.monthlyRemaining).toBe(450);
          expect(res.body.data.balance.additional).toBe(200);
        });
    });

    it("should return hasCredits false when user has no credits", () => {
      mockCreditsService.getAvailableCredits.mockResolvedValueOnce({
        hasCredits: false,
        balance: {
          monthlyRemaining: 0,
          additional: 0,
        },
      });

      return request(app.getHttpServer())
        .get("/v2/credits/available")
        .set({ Authorization: "Bearer fake" })
        .expect(200)
        .then((res) => {
          expect(res.body.status).toEqual("success");
          expect(res.body.data.hasCredits).toBe(false);
          expect(res.body.data.balance.monthlyRemaining).toBe(0);
          expect(res.body.data.balance.additional).toBe(0);
        });
    });
  });

  describe("POST /v2/credits/charge", () => {
    it("should return 400 with empty body", () => {
      return request(app.getHttpServer())
        .post("/v2/credits/charge")
        .set({ Authorization: "Bearer fake" })
        .send({})
        .expect(400);
    });

    it("should charge credits for authenticated user", () => {
      return request(app.getHttpServer())
        .post("/v2/credits/charge")
        .set({ Authorization: "Bearer fake" })
        .send({
          credits: 5,
          creditFor: "AI_AGENT",
          externalRef: `test-ref-${randomString()}`,
        })
        .expect(200)
        .then((res) => {
          expect(res.body.status).toEqual("success");
          expect(res.body.data).toBeDefined();
          expect(res.body.data.charged).toBe(true);
          expect(res.body.data.remainingBalance).toBeDefined();
          expect(res.body.data.remainingBalance.monthlyRemaining).toBe(445);
          expect(res.body.data.remainingBalance.additional).toBe(200);
        });
    });

    it("should accept charge without externalRef", () => {
      return request(app.getHttpServer())
        .post("/v2/credits/charge")
        .set({ Authorization: "Bearer fake" })
        .send({
          credits: 5,
          creditFor: "AI_AGENT",
        })
        .expect(200)
        .then((res) => {
          expect(res.body.status).toEqual("success");
          expect(res.body.data.charged).toBe(true);
        });
    });

    it("should reject invalid creditFor value", () => {
      return request(app.getHttpServer())
        .post("/v2/credits/charge")
        .set({ Authorization: "Bearer fake" })
        .send({
          credits: 5,
          creditFor: "INVALID_TYPE",
        })
        .expect(400);
    });

    it("should reject zero credits", () => {
      return request(app.getHttpServer())
        .post("/v2/credits/charge")
        .set({ Authorization: "Bearer fake" })
        .send({
          credits: 0,
          creditFor: "AI_AGENT",
        })
        .expect(400);
    });

    it("should reject negative credits", () => {
      return request(app.getHttpServer())
        .post("/v2/credits/charge")
        .set({ Authorization: "Bearer fake" })
        .send({
          credits: -5,
          creditFor: "AI_AGENT",
        })
        .expect(400);
    });

    it("should pass externalRef to the service for idempotency", async () => {
      const externalRef = `idempotency-test-${randomString()}`;
      mockCreditsService.chargeCredits.mockClear();

      await request(app.getHttpServer())
        .post("/v2/credits/charge")
        .set({ Authorization: "Bearer fake" })
        .send({
          credits: 5,
          creditFor: "AI_AGENT",
          externalRef,
        })
        .expect(200);

      expect(mockCreditsService.chargeCredits).toHaveBeenCalledWith(
        expect.objectContaining({
          credits: 5,
          creditFor: "AI_AGENT",
          externalRef,
        })
      );
    });

    it("should accept all valid CreditUsageType values", async () => {
      for (const creditFor of ["SMS", "CAL_AI_PHONE_CALL", "AI_AGENT"]) {
        await request(app.getHttpServer())
          .post("/v2/credits/charge")
          .set({ Authorization: "Bearer fake" })
          .send({
            credits: 1,
            creditFor,
          })
          .expect(200);
      }
    });
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(user.email);
    await app.close();
  });
});
