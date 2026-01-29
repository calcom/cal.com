import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { OAuth2ClientRepositoryFixture } from "test/fixtures/repository/oauth2-client.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { ZodExceptionFilter } from "@/filters/zod-exception.filter";
import { AuthModule } from "@/modules/auth/auth.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Atoms OAuth2 Controller Endpoints", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let oAuthClientFixture: OAuth2ClientRepositoryFixture;

  const testClientId = `test-atoms-oauth-client-${randomString()}`;
  const testRedirectUri = "https://example.com/callback";

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [PrismaExceptionFilter, HttpExceptionFilter, ZodExceptionFilter],
      imports: [AppModule, UsersModule, AuthModule, PrismaModule],
    }).compile();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();

    oAuthClientFixture = new OAuth2ClientRepositoryFixture(moduleRef);

    await oAuthClientFixture.create({
      clientId: testClientId,
      name: "Test Atoms OAuth Client",
      redirectUri: testRedirectUri,
    });
  });

  describe("GET /api/v2/atoms/auth/oauth2/clients/:clientId", () => {
    it("should return 200 and correct client ID for existing OAuth client", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/atoms/auth/oauth2/clients/${testClientId}`)
        .expect(200);

      expect(response.body.status).toBe(SUCCESS_STATUS);
      expect(response.body.data.clientId).toBe(testClientId);
      expect(response.body.data.organizationId).toBeNull();
    });

    it("should return 404 with error message for non-existing OAuth client", async () => {
      const nonExistentClientId = `non-existent-client-${randomString()}`;

      const response = await request(app.getHttpServer())
        .get(`/api/v2/atoms/auth/oauth2/clients/${nonExistentClientId}`)
        .expect(404);

      expect(response.body.error.message).toBe("unauthorized_client");
    });
  });

  afterAll(async () => {
    await oAuthClientFixture.delete(testClientId);
    await app.close();
  });
});
