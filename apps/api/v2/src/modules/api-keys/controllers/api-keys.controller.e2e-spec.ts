import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("ApiKeysController (e2e)", () => {
  let app: INestApplication;
  let userRepositoryFixture: UserRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;

  let user: User;
  let apiKeyString: string;
  const userEmail = `api-keys-controller-e2e-${randomString()}@api.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, TokensModule],
    }).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);

    user = await userRepositoryFixture.create({
      email: userEmail,
      username: userEmail,
    });

    const { keyString } = await apiKeysRepositoryFixture.createApiKey(user.id, null);
    apiKeyString = keyString;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  describe("POST /v2/api-keys/refresh", () => {
    it("should return 401 without auth header", () => {
      return request(app.getHttpServer()).post("/api/v2/api-keys/refresh").send({}).expect(401);
    });

    it("should refresh an api key with valid credentials", () => {
      return request(app.getHttpServer())
        .post("/api/v2/api-keys/refresh")
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({})
        .expect(200)
        .then((res) => {
          expect(res.body.status).toEqual(SUCCESS_STATUS);
          expect(res.body.data).toBeDefined();
          expect(res.body.data.apiKey).toBeDefined();
        });
    });
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(user.email);
    await app.close();
  });
});
