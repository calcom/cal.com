import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { CalendarsService } from "@/v2/calendars/services/calendars.service";
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

describe("Platform Calendars Endpoints", () => {
  let app: INestApplication;

  let oAuthClient: PlatformOAuthClient;
  let organization: Team;
  let userRepositoryFixture: UserRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let tokensRepositoryFixture: TokensRepositoryFixture;
  let credentialsRepositoryFixture: CredentialsRepositoryFixture;
  let user: User;
  let office365Credentials: Credential;
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
    user = await userRepositoryFixture.createOAuthManagedUser("office365-connect@gmail.com", oAuthClient.id);
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

  it(`/GET/v2/calendars/office365/connect: it should respond 401 with invalid access token`, async () => {
    await request(app.getHttpServer())
      .get(`/v2/calendars/office365/connect`)
      .set("Authorization", `Bearer invalid_access_token`)
      .expect(401);
  });

  it(`/GET/v2/calendars/office365/connect: it should redirect to auth-url for office 365 calendar oauth with valid access token `, async () => {
    const response = await request(app.getHttpServer())
      .get(`/v2/calendars/office365/connect`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("Origin", CLIENT_REDIRECT_URI)
      .expect(200);
    const data = response.body.data;
    expect(data.authUrl).toBeDefined();
  });

  it(`/GET/v2/calendars/office365/save: without access token`, async () => {
    await request(app.getHttpServer())
      .get(
        `/v2/calendars/office365/save?state=accessToken=${accessTokenSecret}&code=4/0AfJohXmBuT7QVrEPlAJLBu4ZcSnyj5jtDoJqSW_riPUhPXQ70RPGkOEbVO3xs-OzQwpPQw&scope=User.Read%20Calendars.Read%20Calendars.ReadWrite%20offline_access`
      )
      .expect(400);
  });

  it(`/GET/v2/calendars/office365/save: without origin`, async () => {
    await request(app.getHttpServer())
      .get(
        `/v2/calendars/office365/save?state=accessToken=${accessTokenSecret}&code=4/0AfJohXmBuT7QVrEPlAJLBu4ZcSnyj5jtDoJqSW_riPUhPXQ70RPGkOEbVO3xs-OzQwpPQw&scope=User.Read%20Calendars.Read%20Calendars.ReadWrite%20offline_access`
      )
      .expect(400);
  });

  it(`/GET/v2/calendars/office365/check without access token`, async () => {
    await request(app.getHttpServer()).get(`/v2/calendars/office365/check`).expect(401);
  });

  it(`/GET/v2/calendars/office365/check with no credentials`, async () => {
    await request(app.getHttpServer())
      .get(`/v2/calendars/office365/check`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("Origin", CLIENT_REDIRECT_URI)
      .expect(400);
  });

  it(`/GET/v2/calendars/office365/check with access token, origin and office365 credentials`, async () => {
    office365Credentials = await credentialsRepositoryFixture.create(
      "office365_calendar",
      {},
      user.id,
      "office365-calendar"
    );
    await request(app.getHttpServer())
      .get(`/v2/calendars/office365/check`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("Origin", CLIENT_REDIRECT_URI)
      .expect(200);
  });

  afterAll(async () => {
    await oauthClientRepositoryFixture.delete(oAuthClient.id);
    await teamRepositoryFixture.delete(organization.id);
    await credentialsRepositoryFixture.delete(office365Credentials.id);
    await userRepositoryFixture.deleteByEmail(user.email);
    await app.close();
  });
});
