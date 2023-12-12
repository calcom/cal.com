import { AppModule } from "@/app.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { NextAuthStrategy } from "@/modules/auth/strategy";
import { OAuthClientModule } from "@/modules/oauth/oauth-client.module";
import { UserModule } from "@/modules/repositories/user/user-repository.module";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";

import { NextAuthMockStrategy } from "./mocks/next-auth-mock.strategy";
import { withNextAuth } from "./utils/withNextAuth";

describe("oAuth: User is not authenticated", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, OAuthClientModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it(`/GET`, () => {
    return request(app.getHttpServer()).get("/oauth-clients").expect(401);
  });
  it(`/GET/:id`, () => {
    return request(app.getHttpServer()).get("/oauth-clients/1234").expect(401);
  });
  it(`/POST`, () => {
    return request(app.getHttpServer()).post("/oauth-clients").expect(401);
  });
  it(`/PUT:id`, () => {
    return request(app.getHttpServer()).put("/oauth-clients/1234").expect(401);
  });
  it(`/delete:id`, () => {
    return request(app.getHttpServer()).delete("/oauth-clients/1234").expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});

describe("oAuth: User is authenticated but not part of an organization", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await withNextAuth(
      "pro@example.com",
      Test.createTestingModule({
        imports: [AppModule, OAuthClientModule, UserModule, AuthModule],
      })
    ).compile();
    const strategy = moduleRef.get(NextAuthStrategy);
    expect(strategy).toBeInstanceOf(NextAuthMockStrategy);
    app = moduleRef.createNestApplication();
    await app.init();
  });

  it(`/GET`, () => {
    return request(app.getHttpServer()).get("/oauth-clients").expect(403);
  });
  it(`/GET/:id`, () => {
    return request(app.getHttpServer()).get("/oauth-clients/1234").expect(403);
  });
  it(`/POST`, () => {
    return request(app.getHttpServer()).post("/oauth-clients").expect(403);
  });
  it(`/PUT:id`, () => {
    return request(app.getHttpServer()).put("/oauth-clients/1234").expect(403);
  });
  it(`/delete:id`, () => {
    return request(app.getHttpServer()).delete("/oauth-clients/1234").expect(403);
  });

  afterAll(async () => {
    await app.close();
  });
});
