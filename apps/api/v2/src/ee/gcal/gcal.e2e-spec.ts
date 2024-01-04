import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { PlatformOAuthClient, Team, User, Credential } from "@prisma/client";
import * as request from "supertest";
import { CredentialsRepositoryFixture } from "test/fixtures/repository/credentials.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { TokensRepositoryFixture } from "test/fixtures/repository/tokens.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";

describe("OAuth Atom Gcal Connect Endpoints", () => {
  let app: INestApplication;

  let oAuthClient: PlatformOAuthClient;
  let organization: Team;
  let userRepositoryFixture: UserRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let tokensRepositoryFixture: TokensRepositoryFixture;
  let credentialsRepositoryFixture: CredentialsRepositoryFixture;
  let user: User;
  let gcalCredentials: Credential;
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
    credentialsRepositoryFixture = new CredentialsRepositoryFixture(moduleRef);
    organization = await teamRepositoryFixture.create({ name: "organization" });
    oAuthClient = await createOAuthClient(organization.id);
    user = await userRepositoryFixture.createOAuthManagedUser("gcal-connect@gmail.com", oAuthClient.id);
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

  it(`/GET/platform/gcal/check with access token`, async () => {
    await request(app.getHttpServer())
      .get(`/api/v2/platform/gcal/check`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .expect(400);
  });

  it(`/GET/platform/gcal/check without access token`, async () => {
    await request(app.getHttpServer()).get(`/api/v2/platform/gcal/check`).expect(401);
  });

  it(`/GET/platform/gcal/check with access token but no credentials`, async () => {
    await request(app.getHttpServer())
      .get(`/api/v2/platform/gcal/check`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .expect(400);
  });

  it(`/GET/platform/gcal/check with access token and gcal credentials`, async () => {
    gcalCredentials = await credentialsRepositoryFixture.create(
      "google_calendar",
      {},
      user.id,
      "google-calendar"
    );
    await request(app.getHttpServer())
      .get(`/api/v2/platform/gcal/check`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .expect(200);
  });

  afterAll(async () => {
    await oauthClientRepositoryFixture.delete(oAuthClient.id);
    await teamRepositoryFixture.delete(organization.id);
    await credentialsRepositoryFixture.delete(gcalCredentials.id);
    await userRepositoryFixture.deleteByEmail(user.email);
    await app.close();
  });
});
