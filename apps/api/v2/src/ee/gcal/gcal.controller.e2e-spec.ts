import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { TokensModule } from "@/modules/tokens/tokens.module";
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

const CLIENT_REDIRECT_URI = "http://localhost:5555";

class CalendarsServiceMock {
  async getCalendars() {
    return {
      connectedCalendars: [
        {
          integration: {
            type: "google_calendar",
          },
        },
      ],
    };
  }
}

describe("Platform Gcal Endpoints", () => {
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
      imports: [AppModule, UsersModule, TokensModule],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: () => true,
      })
      .overrideProvider(CalendarsService)
      .useClass(CalendarsServiceMock)
      .compile();

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
      redirectUris: [CLIENT_REDIRECT_URI],
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

  it(`/GET/ee/gcal/oauth/auth-url: it should respond 401 with invalid access token`, async () => {
    await request(app.getHttpServer())
      .get(`/v2/gcal/oauth/auth-url`)
      .set("Authorization", `Bearer invalid_access_token`)
      .expect(401);
  });

  it(`/GET/ee/gcal/oauth/auth-url: it should auth-url to google oauth with valid access token `, async () => {
    const response = await request(app.getHttpServer())
      .get(`/v2/gcal/oauth/auth-url`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("Origin", CLIENT_REDIRECT_URI)
      .expect(200);
    const data = response.body.data;
    expect(data.authUrl).toBeDefined();
  });

  it(`/GET/ee/gcal/oauth/save: without oauth code`, async () => {
    await request(app.getHttpServer())
      .get(
        `/v2/gcal/oauth/save?state=accessToken=${accessTokenSecret}&origin%3D${CLIENT_REDIRECT_URI}&scope=https://www.googleapis.com/auth/calendar.readonly%20https://www.googleapis.com/auth/calendar.events`
      )
      .expect(400);
  });

  it(`/GET/ee/gcal/oauth/save: without access token`, async () => {
    await request(app.getHttpServer())
      .get(
        `/v2/gcal/oauth/save?state=origin%3D${CLIENT_REDIRECT_URI}&code=4/0AfJohXmBuT7QVrEPlAJLBu4ZcSnyj5jtDoJqSW_riPUhPXQ70RPGkOEbVO3xs-OzQwpPQw&scope=https://www.googleapis.com/auth/calendar.readonly%20https://www.googleapis.com/auth/calendar.events`
      )
      .expect(400);
  });

  it(`/GET/ee/gcal/oauth/save: without origin`, async () => {
    await request(app.getHttpServer())
      .get(
        `/v2/gcal/oauth/save?state=accessToken=${accessTokenSecret}&code=4/0AfJohXmBuT7QVrEPlAJLBu4ZcSnyj5jtDoJqSW_riPUhPXQ70RPGkOEbVO3xs-OzQwpPQw&scope=https://www.googleapis.com/auth/calendar.readonly%20https://www.googleapis.com/auth/calendar.events`
      )
      .expect(400);
  });

  it(`/GET/ee/gcal/check with access token but without origin`, async () => {
    await request(app.getHttpServer())
      .get(`/v2/gcal/check`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .expect(400);
  });

  it(`/GET/ee/gcal/check without access token`, async () => {
    await request(app.getHttpServer()).get(`/v2/gcal/check`).expect(401);
  });

  it(`/GET/ee/gcal/check with access token and origin but no credentials`, async () => {
    await request(app.getHttpServer())
      .get(`/v2/gcal/check`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("Origin", CLIENT_REDIRECT_URI)
      .expect(400);
  });

  it(`/GET/ee/gcal/check with access token and origin and gcal credentials`, async () => {
    gcalCredentials = await credentialsRepositoryFixture.create(
      "google_calendar",
      {},
      user.id,
      "google-calendar"
    );
    await request(app.getHttpServer())
      .get(`/v2/gcal/check`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("Origin", CLIENT_REDIRECT_URI)
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
