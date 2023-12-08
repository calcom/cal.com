import { AppModule } from "@/app.module";
import { OAuthClientModule } from "@/modules/oauth/oauth-client.module";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";

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
