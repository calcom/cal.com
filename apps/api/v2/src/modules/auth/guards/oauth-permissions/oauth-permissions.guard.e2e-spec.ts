import { generateSecret } from "@calcom/platform-libraries";
import type { Membership, Team, User } from "@calcom/prisma/client";
import { AccessScope, MembershipRole, OAuthClientType } from "@calcom/prisma/enums";
import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuth2ClientRepositoryFixture } from "test/fixtures/repository/oauth2-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { ZodExceptionFilter } from "@/filters/zod-exception.filter";
import { OAuthService } from "@/lib/services/oauth.service";

jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn().mockResolvedValue(null),
}));

describe("OAuth Permissions Guard E2E", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  let userRepositoryFixture: UserRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let membershipRepositoryFixture: MembershipRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let profileRepositoryFixture: ProfileRepositoryFixture;
  let oAuthClientFixture: OAuth2ClientRepositoryFixture;
  let oAuthService: OAuthService;

  let user: User;
  let standaloneTeam: Team;
  let org: Team;
  let orgTeam: Team;
  let standaloneMembership: Membership;
  let orgMembership: Membership;
  let orgTeamMembership: Membership;
  let oAuthClient: { clientId: string };

  const testClientId = `scope-e2e-client-${randomString()}`;
  const testClientSecret = "scope-e2e-secret";
  const testRedirectUri = "https://example.com/callback";

  async function getAccessToken(userId: number, scopes: AccessScope[]): Promise<string> {
    const result = await oAuthService.generateAuthorizationCode(
      testClientId,
      userId,
      testRedirectUri,
      scopes
    );
    const redirectUrl = new URL(result.redirectUrl);
    const code = redirectUrl.searchParams.get("code") as string;

    const response = await request(app.getHttpServer())
      .post("/api/v2/auth/oauth2/token")
      .type("form")
      .send({
        client_id: testClientId,
        grant_type: "authorization_code",
        code,
        client_secret: testClientSecret,
        redirect_uri: testRedirectUri,
      })
      .expect(200);

    return response.body.access_token;
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [PrismaExceptionFilter, HttpExceptionFilter, ZodExceptionFilter],
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
    profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    oAuthClientFixture = new OAuth2ClientRepositoryFixture(moduleRef);
    oAuthService = moduleRef.get(OAuthService);

    const uniqueId = randomString();

    user = await userRepositoryFixture.create({
      email: `scope-e2e-user-${uniqueId}@api.com`,
      username: `scope-e2e-user-${uniqueId}`,
    });

    standaloneTeam = await teamRepositoryFixture.create({
      name: `scope-e2e-team-${uniqueId}`,
      slug: `scope-e2e-team-${uniqueId}`,
    });

    standaloneMembership = await membershipRepositoryFixture.create({
      user: { connect: { id: user.id } },
      team: { connect: { id: standaloneTeam.id } },
      role: MembershipRole.OWNER,
      accepted: true,
    });

    org = await organizationsRepositoryFixture.create({
      name: `scope-e2e-org-${uniqueId}`,
    });

    orgMembership = await membershipRepositoryFixture.create({
      user: { connect: { id: user.id } },
      team: { connect: { id: org.id } },
      role: MembershipRole.ADMIN,
      accepted: true,
    });

    await profileRepositoryFixture.create({
      uid: `usr-${user.id}`,
      username: user.email!,
      organization: { connect: { id: org.id } },
      user: { connect: { id: user.id } },
    });

    orgTeam = await teamRepositoryFixture.create({
      name: `scope-e2e-org-team-${uniqueId}`,
      slug: `scope-e2e-org-team-${uniqueId}`,
      parent: { connect: { id: org.id } },
    });

    orgTeamMembership = await membershipRepositoryFixture.create({
      user: { connect: { id: user.id } },
      team: { connect: { id: orgTeam.id } },
      role: MembershipRole.ADMIN,
      accepted: true,
    });

    const [hashedSecret] = generateSecret(testClientSecret);
    oAuthClient = await oAuthClientFixture.create({
      clientId: testClientId,
      name: "Scope E2E Test Client",
      redirectUri: testRedirectUri,
      clientSecret: hashedSecret,
      clientType: OAuthClientType.CONFIDENTIAL,
      userId: user.id,
    });
  });

  describe("personal endpoints", () => {
    describe("positive", () => {
      it("should allow GET /me with PROFILE_READ scope", async () => {
        const token = await getAccessToken(user.id, [AccessScope.PROFILE_READ]);

        const response = await request(app.getHttpServer())
          .get("/api/v2/me")
          .set({ Authorization: `Bearer ${token}` })
          .expect(200);

        expect(response.body.status).toBe("success");
      });
    });

    describe("negative", () => {
      it("should deny GET /me with wrong resource scope (BOOKING_READ)", async () => {
        const token = await getAccessToken(user.id, [AccessScope.BOOKING_READ]);

        const response = await request(app.getHttpServer())
          .get("/api/v2/me")
          .set({ Authorization: `Bearer ${token}` })
          .expect(403);

        expect(response.body.error.message).toBe(
          "insufficient_scope: token does not have the required scopes. Required: PROFILE_READ. Token has: BOOKING_READ"
        );
      });

      it("should deny new-style token on endpoint without @OAuthPermissions decorator", async () => {
        const token = await getAccessToken(user.id, [AccessScope.PROFILE_READ]);

        const response = await request(app.getHttpServer())
          .post("/api/v2/calendars/ics-feed/save")
          .set({ Authorization: `Bearer ${token}` })
          .send({ urls: ["https://example.com/feed.ics"] })
          .expect(403);

        expect(response.body.error.message).toBe(
          "insufficient_scope: this endpoint is not available for third-party OAuth tokens"
        );
      });
    });
  });

  describe("team endpoints", () => {
    describe("positive", () => {
      it("should allow GET /teams with TEAM_PROFILE_READ scope", async () => {
        const token = await getAccessToken(user.id, [AccessScope.TEAM_PROFILE_READ]);

        const response = await request(app.getHttpServer())
          .get("/api/v2/teams")
          .set({ Authorization: `Bearer ${token}` })
          .expect(200);

        expect(response.body.status).toBe("success");
      });
    });

    describe("negative", () => {
      it("should deny GET /teams with personal PROFILE_READ scope", async () => {
        const token = await getAccessToken(user.id, [AccessScope.PROFILE_READ]);

        const response = await request(app.getHttpServer())
          .get("/api/v2/teams")
          .set({ Authorization: `Bearer ${token}` })
          .expect(403);

        expect(response.body.error.message).toBe(
          "insufficient_scope: token does not have the required scopes. Required: TEAM_PROFILE_READ. Token has: PROFILE_READ"
        );
      });
    });
  });

  describe("role-protected endpoints with third-party tokens", () => {
    let memberUser: User;
    let memberTeamMembership: Membership;
    let memberOrgMembership: Membership;

    beforeAll(async () => {
      const uniqueId = randomString();

      memberUser = await userRepositoryFixture.create({
        email: `scope-e2e-member-${uniqueId}@api.com`,
        username: `scope-e2e-member-${uniqueId}`,
      });

      memberTeamMembership = await membershipRepositoryFixture.create({
        user: { connect: { id: memberUser.id } },
        team: { connect: { id: standaloneTeam.id } },
        role: MembershipRole.MEMBER,
        accepted: true,
      });

      memberOrgMembership = await membershipRepositoryFixture.create({
        user: { connect: { id: memberUser.id } },
        team: { connect: { id: org.id } },
        role: MembershipRole.MEMBER,
        accepted: true,
      });

      await profileRepositoryFixture.create({
        uid: `usr-${memberUser.id}`,
        username: memberUser.email!,
        organization: { connect: { id: org.id } },
        user: { connect: { id: memberUser.id } },
      });
    });

    it("should allow MEMBER to access @Roles('TEAM_ADMIN') endpoint with TEAM_SCHEDULE_READ scope", async () => {
      const token = await getAccessToken(memberUser.id, [AccessScope.TEAM_SCHEDULE_READ]);

      const response = await request(app.getHttpServer())
        .get(`/api/v2/teams/${standaloneTeam.id}/schedules`)
        .set({ Authorization: `Bearer ${token}` })
        .expect(200);

      expect(response.body.status).toBe("success");
    });

    it("should allow MEMBER to access @Roles('ORG_ADMIN') endpoint with ORG_PROFILE_READ scope", async () => {
      const token = await getAccessToken(memberUser.id, [AccessScope.ORG_PROFILE_READ]);

      const response = await request(app.getHttpServer())
        .get(`/api/v2/organizations/${org.id}/teams`)
        .set({ Authorization: `Bearer ${token}` })
        .expect(200);

      expect(response.body.status).toBe("success");
    });

    afterAll(async () => {
      await membershipRepositoryFixture.delete(memberOrgMembership.id);
      await membershipRepositoryFixture.delete(memberTeamMembership.id);
      await userRepositoryFixture.delete(memberUser.id);
    });
  });

  describe("org endpoints", () => {
    describe("positive", () => {
      it("should allow GET /organizations/:orgId/teams/:teamId with TEAM_PROFILE_READ scope", async () => {
        const token = await getAccessToken(user.id, [AccessScope.TEAM_PROFILE_READ]);

        const response = await request(app.getHttpServer())
          .get(`/api/v2/organizations/${org.id}/teams/${orgTeam.id}`)
          .set({ Authorization: `Bearer ${token}` })
          .expect(200);

        expect(response.body.status).toBe("success");
      });

      it("should allow GET /organizations/:orgId/teams with ORG_PROFILE_READ scope", async () => {
        const token = await getAccessToken(user.id, [AccessScope.ORG_PROFILE_READ]);

        const response = await request(app.getHttpServer())
          .get(`/api/v2/organizations/${org.id}/teams`)
          .set({ Authorization: `Bearer ${token}` })
          .expect(200);

        expect(response.body.status).toBe("success");
      });

      it("should allow GET /organizations/:orgId/teams/:teamId with ORG_PROFILE_READ", async () => {
        const token = await getAccessToken(user.id, [AccessScope.ORG_PROFILE_READ]);

        const response = await request(app.getHttpServer())
          .get(`/api/v2/organizations/${org.id}/teams/${orgTeam.id}`)
          .set({ Authorization: `Bearer ${token}` })
          .expect(200);

        expect(response.body.status).toBe("success");
      });
    });

    describe("negative", () => {
      it("should deny GET /organizations/:orgId/teams with TEAM_PROFILE_READ scope", async () => {
        const token = await getAccessToken(user.id, [AccessScope.TEAM_PROFILE_READ]);

        const response = await request(app.getHttpServer())
          .get(`/api/v2/organizations/${org.id}/teams`)
          .set({ Authorization: `Bearer ${token}` })
          .expect(403);

        expect(response.body.error.message).toBe(
          "insufficient_scope: token does not have the required scopes. Required: ORG_PROFILE_READ. Token has: TEAM_PROFILE_READ"
        );
      });
    });
  });

  afterAll(async () => {
    await oAuthClientFixture.delete(oAuthClient.clientId);
    await membershipRepositoryFixture.delete(orgTeamMembership.id);
    await membershipRepositoryFixture.delete(orgMembership.id);
    await membershipRepositoryFixture.delete(standaloneMembership.id);
    await teamRepositoryFixture.delete(orgTeam.id);
    await teamRepositoryFixture.delete(org.id);
    await teamRepositoryFixture.delete(standaloneTeam.id);
    await userRepositoryFixture.delete(user.id);
    await app.close();
  });
});
