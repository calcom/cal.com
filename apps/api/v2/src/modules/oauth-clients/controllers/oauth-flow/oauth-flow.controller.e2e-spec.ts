import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { ZodExceptionFilter } from "@/filters/zod-exception.filter";
import { AuthModule } from "@/modules/auth/auth.module";
import { OAuthAuthorizeInput } from "@/modules/oauth-clients/inputs/authorize.input";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Membership, PlatformOAuthClient, Team, User } from "@prisma/client";
import * as request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withNextAuth } from "test/utils/withNextAuth";

describe("OAuthFlow Endpoints", () => {
  let app: INestApplication;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let testClient: PlatformOAuthClient;
  const userEmail = "user@api.com";
  let authorizationCode: string | null;
  let refreshToken: string;
  let membership: Membership;
  let organization: Team;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let usersFixtures: UserRepositoryFixture;
  let membershipFixtures: MembershipRepositoryFixture;
  let user: User;

  beforeAll(async () => {
    const moduleRef: TestingModule = await withNextAuth(
      userEmail,
      Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter, ZodExceptionFilter],
        imports: [AppModule, OAuthClientModule, UsersModule, AuthModule, PrismaModule],
      })
    ).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Setup OAuthClientRepositoryFixture
    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    usersFixtures = new UserRepositoryFixture(moduleRef);
    membershipFixtures = new MembershipRepositoryFixture(moduleRef);

    // Create a test OAuth client
    user = await usersFixtures.create({
      email: userEmail,
    });
    organization = await teamRepositoryFixture.create({ name: "organization" });
    membership = await membershipFixtures.addUserToOrg(user, organization, "OWNER", true);
    testClient = await createOAuthClient(organization.id);
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

  describe("Authorize Endpoint", () => {
    it.only("POST /oauth/:clientId/authorize", async () => {
      const body: OAuthAuthorizeInput = {
        redirectUri: testClient.redirectUris[0],
      };

      const REDIRECT_STATUS = 302;

      const response = await request(app.getHttpServer())
        .post(`/oauth/${testClient.id}/authorize`)
        .send(body)
        .expect(REDIRECT_STATUS);

      console.log("asap response", JSON.stringify(response, null, 2));

      const baseUrl = "http://www.localhost/";
      const redirectUri = new URL(response.header.location, baseUrl);
      authorizationCode = redirectUri.searchParams.get("code");
      expect(authorizationCode).toBeDefined();
    });
  });

  // describe('Exchange Endpoint', () => {
  //   it('POST /oauth/:clientId/exchange', async () => {
  //     const authorizationToken = 'Bearer exampleBearerToken';
  //     const body = {
  //       clientSecret: testClient.secret,
  //       code: authorizationCode,
  //     };

  //     const response = await request(app.getHttpServer())
  //       .post(`/oauth/${testClient.id}/exchange`)
  //       .set('Authorization', authorizationToken)
  //       .send(body)
  //       .expect(200);

  //     expect(response.body).toHaveProperty('data');
  //     expect(response.body.data).toHaveProperty('accessToken');
  //     expect(response.body.data).toHaveProperty('refreshToken');
  //     refreshToken = response.body.data.refreshToken;
  //   });
  // });

  // describe('Refresh Token Endpoint', () => {
  //   it('POST /oauth/:clientId/refresh', () => {
  //     const secretKey = testClient.secret;
  //     const body = {
  //       refreshToken,
  //     };

  //     return request(app.getHttpServer())
  //       .post(`/oauth/${testClient.id}/refresh`)
  //       .set('x-cal-secret-key', secretKey)
  //       .send(body)
  //       .expect(200)
  //       .then((response) => {
  //         expect(response.body).toHaveProperty('data');
  //         expect(response.body.data).toHaveProperty('accessToken');
  //         expect(response.body.data).toHaveProperty('refreshToken');
  //       });
  //   });
  // });

  afterAll(async () => {
    await oauthClientRepositoryFixture.delete(testClient.id);
    await teamRepositoryFixture.delete(organization.id);
    await usersFixtures.delete(user.id);

    await app.close();
  });
});
