import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { PlatformOAuthClient, Team, User } from "@prisma/client";
import * as request from "supertest";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { TokensRepositoryFixture } from "test/fixtures/repository/tokens.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";

describe("OAuth Gcal App Endpoints", () => {
  let app: INestApplication;

  let oAuthClient: PlatformOAuthClient;
  let organization: Team;
  let userRepositoryFixture: UserRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let tokensRepositoryFixture: TokensRepositoryFixture;

  let user: User;
  let accessTokenSecret: string;
  let refreshTokenSecret: string;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaExceptionFilter, HttpExceptionFilter],
      imports: [AppModule, UsersModule],
    }).compile();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    tokensRepositoryFixture = new TokensRepositoryFixture(moduleRef);
    organization = await teamRepositoryFixture.create({ name: "organization" });
    oAuthClient = await createOAuthClient(organization.id);
    user = await userRepositoryFixture.createOAuthManagedUser("managed-user-e2e@gmail.com", oAuthClient.id);
    const tokens = await tokensRepositoryFixture.createTokens(user.id, oAuthClient.id);
    accessTokenSecret = tokens.accessToken;
    refreshTokenSecret = tokens.refreshToken;
    await app.init();
  });

  async function createOAuthClient(organizationId: number) {
    const data = {
      logo: "logo-url",
      name: "name",
      redirectUris: ["redirect-uri"],
      permissions: 32,
    };
    const secret = "secret";

    const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
    return client;
  }

  it("should be defined", () => {
    expect(oauthClientRepositoryFixture).toBeDefined();
    expect(userRepositoryFixture).toBeDefined();
    expect(oAuthClient).toBeDefined();
    expect(accessTokenSecret).toBeDefined();
    expect(refreshTokenSecret).toBeDefined();
    expect(user).toBeDefined();
  });

  it(`/GET/apps/gcal/oauth/redirect: it should respond 401 with invalid access token`, async () => {
    await request(app.getHttpServer())
      .get(`/api/v2/apps/gcal/oauth/redirect`)
      .set("Authorization", `Bearer invalid_access_token`)
      .expect(401);
  });

  it(`/GET/apps/gcal/oauth/redirect: it should redirect to google oauth with valid access token `, async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v2/apps/gcal/oauth/redirect`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("origin", "http://localhost:5555")
      .expect(301);
    const redirectUrl = response.get("location");
    expect(redirectUrl).toBeDefined();
    expect(redirectUrl).toContain("https://accounts.google.com/o/oauth2/v2/auth");
  });

  it(`/GET/apps/gcal/oauth/save: without oauth code`, async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v2/apps/gcal/oauth/save?state=accessToken=${accessTokenSecret}&origin%3Dhttp://localhost:5555&scope=https://www.googleapis.com/auth/calendar.readonly%20https://www.googleapis.com/auth/calendar.events`
      )
      .expect(400);
  });

  it(`/GET/apps/gcal/oauth/save: without access token`, async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v2/apps/gcal/oauth/save?state=origin%3Dhttp://localhost:5555&code=4/0AfJohXmBuT7QVrEPlAJLBu4ZcSnyj5jtDoJqSW_riPUhPXQ70RPGkOEbVO3xs-OzQwpPQw&scope=https://www.googleapis.com/auth/calendar.readonly%20https://www.googleapis.com/auth/calendar.events`
      )
      .expect(401);
  });

  it(`/GET/apps/gcal/oauth/save: without origin`, async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v2/apps/gcal/oauth/save?state=accessToken=${accessTokenSecret}&code=4/0AfJohXmBuT7QVrEPlAJLBu4ZcSnyj5jtDoJqSW_riPUhPXQ70RPGkOEbVO3xs-OzQwpPQw&scope=https://www.googleapis.com/auth/calendar.readonly%20https://www.googleapis.com/auth/calendar.events`
      )
      .expect(400);
  });

  it(`/GET/apps/gcal/oauth/check with access token`, async () => {
    await request(app.getHttpServer())
      .get(`/api/v2/apps/gcal/oauth/check`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .expect(400);
  });

  it(`/GET/apps/gcal/oauth/check without access token`, async () => {
    await request(app.getHttpServer()).get(`/api/v2/apps/gcal/oauth/check`).expect(401);
  });

  afterAll(async () => {
    await oauthClientRepositoryFixture.delete(oAuthClient.id);
    await teamRepositoryFixture.delete(organization.id);
    await userRepositoryFixture.deleteByEmail(user.email);
    await app.close();
  });
});
