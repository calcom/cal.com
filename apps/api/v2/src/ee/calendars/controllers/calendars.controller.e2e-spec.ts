import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateIcsFeedOutput, CreateIcsFeedOutputResponseDto } from "@/ee/calendars/input/create-ics.output";
import { DeletedCalendarCredentialsOutputResponseDto } from "@/ee/calendars/outputs/delete-calendar-credentials.output";
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
import { CalendarsServiceMock } from "test/mocks/calendars-service-mock";
import { IcsCalendarServiceMock } from "test/mocks/ics-calendar-service-mock";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  GOOGLE_CALENDAR,
  OFFICE_365_CALENDAR,
  GOOGLE_CALENDAR_TYPE,
  GOOGLE_CALENDAR_ID,
} from "@calcom/platform-constants";
import { OFFICE_365_CALENDAR_ID, OFFICE_365_CALENDAR_TYPE } from "@calcom/platform-constants";
import { ICS_CALENDAR } from "@calcom/platform-constants/apps";
import { IcsFeedCalendarService } from "@calcom/platform-libraries";

const CLIENT_REDIRECT_URI = "http://localhost:5555";

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
  let googleCalendarCredentials: Credential;
  let accessTokenSecret: string;
  let refreshTokenSecret: string;
  let icsCalendarCredentials: CreateIcsFeedOutput;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaExceptionFilter, HttpExceptionFilter],
      imports: [AppModule, UsersModule, TokensModule],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: () => true,
      })

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
    jest
      .spyOn(CalendarsService.prototype, "getCalendars")
      .mockImplementation(CalendarsServiceMock.prototype.getCalendars);
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

  it(`/GET/v2/calendars/${OFFICE_365_CALENDAR}/connect: it should respond 401 with invalid access token`, async () => {
    await request(app.getHttpServer())
      .get(`/v2/calendars/${OFFICE_365_CALENDAR}/connect`)
      .set("Authorization", `Bearer invalid_access_token`)
      .expect(401);
  });

  // TODO: Uncomment this once CI is ready to run proper Office365 tests
  // it(`/GET/v2/calendars/${OFFICE_365_CALENDAR}/connect: it should redirect to auth-url for office 365 calendar OAuth with valid access token `, async () => {
  //   const response = await request(app.getHttpServer())
  //     .get(`/v2/calendars/${OFFICE_365_CALENDAR}/connect`)
  //     .set("Authorization", `Bearer ${accessTokenSecret}`)
  //     .set("Origin", CLIENT_REDIRECT_URI)
  //     .expect(200);
  //   const data = response.body.data;
  //   expect(data.authUrl).toBeDefined();
  // });

  it(`/GET/v2/calendars/${GOOGLE_CALENDAR}/connect: it should redirect to auth-url for google calendar OAuth with valid access token `, async () => {
    const response = await request(app.getHttpServer())
      .get(`/v2/calendars/${GOOGLE_CALENDAR}/connect`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("Origin", CLIENT_REDIRECT_URI)
      .expect(200);
    const data = response.body.data;
    expect(data.authUrl).toBeDefined();
  });

  it(`/GET/v2/calendars/random-calendar/connect: it should respond 400 with a message saying the calendar type is invalid`, async () => {
    await request(app.getHttpServer())
      .get(`/v2/calendars/random-calendar/connect`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("Origin", CLIENT_REDIRECT_URI)
      .expect(400);
  });

  it(`/GET/v2/calendars/${OFFICE_365_CALENDAR}/save: without access token`, async () => {
    await request(app.getHttpServer())
      .get(
        `/v2/calendars/${OFFICE_365_CALENDAR}/save?state=accessToken=${accessTokenSecret}&code=4/0AfJohXmBuT7QVrEPlAJLBu4ZcSnyj5jtDoJqSW_riPUhPXQ70RPGkOEbVO3xs-OzQwpPQw&scope=User.Read%20Calendars.Read%20Calendars.ReadWrite%20offline_access`
      )
      .expect(400);
  });

  it(`/GET/v2/calendars/${OFFICE_365_CALENDAR}/save: without origin`, async () => {
    await request(app.getHttpServer())
      .get(
        `/v2/calendars/${OFFICE_365_CALENDAR}/save?state=accessToken=${accessTokenSecret}&code=4/0AfJohXmBuT7QVrEPlAJLBu4ZcSnyj5jtDoJqSW_riPUhPXQ70RPGkOEbVO3xs-OzQwpPQw&scope=User.Read%20Calendars.Read%20Calendars.ReadWrite%20offline_access`
      )
      .expect(400);
  });

  it(`/GET/v2/calendars/${OFFICE_365_CALENDAR}/check without access token`, async () => {
    await request(app.getHttpServer()).get(`/v2/calendars/${OFFICE_365_CALENDAR}/check`).expect(401);
  });

  it(`/GET/v2/calendars/${OFFICE_365_CALENDAR}/check with no credentials`, async () => {
    await request(app.getHttpServer())
      .get(`/v2/calendars/${OFFICE_365_CALENDAR}/check`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("Origin", CLIENT_REDIRECT_URI)
      .expect(400);
  });

  it(`/GET/v2/calendars/${OFFICE_365_CALENDAR}/check with access token, origin and office365 credentials`, async () => {
    office365Credentials = await credentialsRepositoryFixture.create(
      OFFICE_365_CALENDAR_TYPE,
      {},
      user.id,
      OFFICE_365_CALENDAR_ID
    );
    await request(app.getHttpServer())
      .get(`/v2/calendars/${OFFICE_365_CALENDAR}/check`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("Origin", CLIENT_REDIRECT_URI)
      .expect(200);
  });

  it(`/GET/v2/calendars/${GOOGLE_CALENDAR}/check with access token, origin and google calendar credentials`, async () => {
    googleCalendarCredentials = await credentialsRepositoryFixture.create(
      GOOGLE_CALENDAR_TYPE,
      {},
      user.id,
      GOOGLE_CALENDAR_ID
    );
    await request(app.getHttpServer())
      .get(`/v2/calendars/${GOOGLE_CALENDAR}/check`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("Origin", CLIENT_REDIRECT_URI)
      .expect(200);
  });

  it(`/POST/v2/calendars/${ICS_CALENDAR}/save with access token should fail to create a new ics feed calendar credentials with invalid urls`, async () => {
    const body = {
      urls: ["https://cal.com/ics/feed.ics", "https://not-an-ics-feed.com"],
      readOnly: false,
    };
    await request(app.getHttpServer())
      .post(`/v2/calendars/${ICS_CALENDAR}/save`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("Origin", CLIENT_REDIRECT_URI)
      .send(body)
      .expect(400);
  });

  it(`/POST/v2/calendars/${ICS_CALENDAR}/save with access token should create a new ics feed calendar credentials`, async () => {
    const body = {
      urls: ["https://cal.com/ics/feed.ics"],
      readOnly: false,
    };
    jest
      .spyOn(IcsFeedCalendarService.prototype, "listCalendars")
      .mockImplementation(IcsCalendarServiceMock.prototype.listCalendars);
    await request(app.getHttpServer())
      .post(`/v2/calendars/${ICS_CALENDAR}/save`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("Origin", CLIENT_REDIRECT_URI)
      .send(body)
      .expect(201)
      .then(async (response) => {
        const responseBody: CreateIcsFeedOutputResponseDto = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data).toBeDefined();
        expect(responseBody.data.userId).toBeDefined();
        expect(responseBody.data.userId).toEqual(user.id);
        expect(responseBody.data.id).toBeDefined();
        icsCalendarCredentials = responseBody.data;
      });
  });

  it(`/GET/v2/calendars/${ICS_CALENDAR}/check with access token`, async () => {
    await request(app.getHttpServer())
      .get(`/v2/calendars/${ICS_CALENDAR}/check`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .set("Origin", CLIENT_REDIRECT_URI)
      .expect(200);
  });

  it.skip(`/POST/v2/calendars/${OFFICE_365_CALENDAR}/disconnect: it should respond with a 201 returning back the user deleted calendar credentials`, async () => {
    const body = {
      id: 10,
    };

    return request(app.getHttpServer())
      .post(`/v2/calendars/${OFFICE_365_CALENDAR}/disconnect`)
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .send(body)
      .expect(201)
      .then(async (response) => {
        const responseBody: Promise<DeletedCalendarCredentialsOutputResponseDto> = response.body;

        expect((await responseBody).status).toEqual(SUCCESS_STATUS);
        expect((await responseBody).data).toBeDefined();
        expect((await responseBody).data.id).toEqual(body.id);
        expect((await responseBody).data.userId).toEqual(user.id);
      });
  });

  afterAll(async () => {
    await oauthClientRepositoryFixture.delete(oAuthClient.id);
    await teamRepositoryFixture.delete(organization.id);
    await credentialsRepositoryFixture.delete(office365Credentials.id);
    await credentialsRepositoryFixture.delete(googleCalendarCredentials.id);
    await credentialsRepositoryFixture.delete(icsCalendarCredentials.id);
    await userRepositoryFixture.deleteByEmail(user.email);
    await app.close();
  });
});
