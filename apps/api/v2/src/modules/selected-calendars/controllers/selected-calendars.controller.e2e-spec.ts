import { APPLE_CALENDAR_ID, APPLE_CALENDAR_TYPE, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { Credential, PlatformOAuthClient, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { CredentialsRepositoryFixture } from "test/fixtures/repository/credentials.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { TokensRepositoryFixture } from "test/fixtures/repository/tokens.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { CalendarsServiceMock } from "test/mocks/calendars-service-mock";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { SelectedCalendarOutputResponseDto } from "@/modules/selected-calendars/outputs/selected-calendars.output";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

const CLIENT_REDIRECT_URI = "http://localhost:5555";

describe("Platform Selected Calendars Endpoints", () => {
  let app: INestApplication;

  let oAuthClient: PlatformOAuthClient;
  let organization: Team;
  let userRepositoryFixture: UserRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let tokensRepositoryFixture: TokensRepositoryFixture;
  let credentialsRepositoryFixture: CredentialsRepositoryFixture;
  let appleCalendarCredentials: Credential;
  let user: User;
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
    appleCalendarCredentials = await credentialsRepositoryFixture.create(
      APPLE_CALENDAR_TYPE,
      {},
      user.id,
      APPLE_CALENDAR_ID
    );
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

  it(`POST /v2/selected-calendars: it should respond with a 201 returning back the user added selected calendar`, async () => {
    const body = {
      integration: appleCalendarCredentials.type,
      externalId: "https://caldav.icloud.com/20961146906/calendars/83C4F9A1-F1D0-41C7-8FC3-0B$9AE22E813/",
      credentialId: appleCalendarCredentials.id,
    };

    await request(app.getHttpServer())
      .post("/v2/selected-calendars")
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .send(body)
      .expect(201)
      .then(async (response) => {
        const responseBody: SelectedCalendarOutputResponseDto = response.body;

        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data).toBeDefined();
        expect(responseBody.data.credentialId).toEqual(body.credentialId);
        expect(responseBody.data.integration).toEqual(body.integration);
        expect(responseBody.data.externalId).toEqual(body.externalId);
        expect(responseBody.data.userId).toEqual(user.id);
      });
  });

  it(`DELETE /v2/selected-calendars: it should respond with a 200 returning back the user deleted selected calendar`, async () => {
    const integration = appleCalendarCredentials.type;
    const externalId =
      "https://caldav.icloud.com/20961146906/calendars/83C4F9A1-F1D0-41C7-8FC3-0B$9AE22E813/";
    const credentialId = appleCalendarCredentials.id;

    await request(app.getHttpServer())
      .delete(
        `/v2/selected-calendars?credentialId=${credentialId}&integration=${integration}&externalId=${externalId}`
      )
      .set("Authorization", `Bearer ${accessTokenSecret}`)
      .expect(200)
      .then(async (response) => {
        const responseBody: SelectedCalendarOutputResponseDto = response.body;

        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data).toBeDefined();
        expect(responseBody.data.credentialId).toEqual(credentialId);
        expect(responseBody.data.externalId).toEqual(externalId);
        expect(responseBody.data.integration).toEqual(integration);
        expect(responseBody.data.userId).toEqual(user.id);
      });
  });

  afterAll(async () => {
    await oauthClientRepositoryFixture.delete(oAuthClient.id);
    await teamRepositoryFixture.delete(organization.id);
    await userRepositoryFixture.deleteByEmail(user.email);
    await app.close();
  });
});
