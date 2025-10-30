import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { EmailService } from "@/modules/email/email.service";
import {
  CreateManagedUserData,
  CreateManagedUserOutput,
} from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/create-managed-user.output";
import {
  PLATFORM_USER_BEING_ADDED_TO_REGULAR_ORG_ERROR,
  REGULAR_USER_BEING_ADDED_TO_PLATFORM_ORG_ERROR,
} from "@/modules/organizations/memberships/services/organizations-membership.service";
import { CreateOrgTeamDto } from "@/modules/organizations/teams/index/inputs/create-organization-team.input";
import { CreateOrgTeamMembershipDto } from "@/modules/organizations/teams/memberships/inputs/create-organization-team-membership.input";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import {
  PLATFORM_USER_BEING_ADDED_TO_REGULAR_TEAM_ERROR,
  REGULAR_USER_BEING_ADDED_TO_PLATFORM_TEAM_ERROR,
  PLATFORM_USER_AND_PLATFORM_TEAM_CREATED_WITH_DIFFERENT_OAUTH_CLIENTS_ERROR,
} from "@/modules/teams/memberships/services/teams-memberships.service";
import { TeamsMembershipsModule } from "@/modules/teams/memberships/teams-memberships.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { CreateUserInput } from "@/modules/users/inputs/create-user.input";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiSuccessResponse } from "@calcom/platform-types";
import { PlatformOAuthClient, User } from "@calcom/prisma/client";
import { Team } from "@calcom/prisma/client";

describe("Organizations Teams Memberships Endpoints", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let teamsRepositoryFixture: TeamRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let profilesRepositoryFixture: ProfileRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;

  let org: Team;
  let orgOwner: User;
  let orgUser: User;
  let orgTeam: Team;
  let orgApiKey: string;

  let platformOrg: Team;
  let platformOrgOwner: User;
  let platformOrgUser: CreateManagedUserData;
  let platformOrgTeam: Team;
  let platformOAuthClient: PlatformOAuthClient;
  let secondPlatformOAuthClient: PlatformOAuthClient;
  let secondPlatformOrgUser: CreateManagedUserData;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, TokensModule, TeamsMembershipsModule],
    }).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
    teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);

    const orgName = `organizations-teams-memberships-organization-${randomString()}`;
    org = await organizationsRepositoryFixture.create({
      name: orgName,
      slug: orgName,
      isOrganization: true,
    });

    const platformOrgName = `organizations-teams-memberships-platform-organization-${randomString()}`;
    platformOrg = await organizationsRepositoryFixture.create({
      isPlatform: true,
      name: platformOrgName,
      slug: platformOrgName,
      isOrganization: true,
      platformBilling: {
        create: {
          customerId: "cus_999",
          plan: "ESSENTIALS",
          subscriptionId: "sub_999",
        },
      },
    });
    platformOAuthClient = await createOAuthClient(platformOrg.id);
    secondPlatformOAuthClient = await createOAuthClient(platformOrg.id);

    orgOwner = await userRepositoryFixture.create({
      email: `organizations-teams-memberships-org-owner-${randomString()}@api.com`,
      username: `organizations-teams-memberships-org-owner-${randomString()}`,
    });
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
    const { keyString } = await apiKeysRepositoryFixture.createApiKey(orgOwner.id, null);
    orgApiKey = `cal_test_${keyString}`;

    await membershipsRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: orgOwner.id } },
      team: { connect: { id: org.id } },
      accepted: true,
    });

    platformOrgOwner = await userRepositoryFixture.create({
      email: `platform-org-owner-${randomString()}@api.com`,
      username: `platform-org-owner-${randomString()}`,
    });

    await membershipsRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: platformOrgOwner.id } },
      team: { connect: { id: platformOrg.id } },
      accepted: true,
    });

    await profilesRepositoryFixture.create({
      uid: "asd1qwwqeqw-asddsadasd",
      username: `platform-org-owner-${randomString()}`,
      organization: { connect: { id: platformOrg.id } },
      user: {
        connect: { id: platformOrgOwner.id },
      },
    });

    await profilesRepositoryFixture.create({
      uid: "asd1qwwqeqw-asddsadasd-2",
      username: `org-owner-${randomString()}`,
      organization: { connect: { id: org.id } },
      user: {
        connect: { id: orgOwner.id },
      },
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  async function createOAuthClient(organizationId: number) {
    const data = {
      logo: "logo-url",
      name: "name",
      redirectUris: ["http://localhost:4321"],
      permissions: 1023,
    };
    const secret = "secret";

    const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
    return client;
  }

  describe("should create org users", () => {
    it("should create a new org user", async () => {
      const newOrgUser: CreateUserInput = {
        email: `organization-user-${randomString()}@api.com`,
      };

      jest
        .spyOn(EmailService.prototype, "sendSignupToOrganizationEmail")
        .mockImplementation(() => Promise.resolve());

      const { body } = await request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users`)
        .send(newOrgUser)
        .set("Content-Type", "application/json")
        .set("Authorization", `Bearer ${orgApiKey}`)
        .set("Accept", "application/json");

      const userData = body.data;
      expect(body.status).toBe(SUCCESS_STATUS);
      expect(userData.email).toBe(newOrgUser.email);
      orgUser = userData;
    });

    it(`should create a new platform org manager user using first oAuth client`, async () => {
      const managedUserEmail = `platform-organization-manager-user-${randomString()}@api.com`;
      const requestBody: CreateManagedUserInput = {
        email: managedUserEmail,
        timeZone: "Europe/Berlin",
        weekStart: "Monday",
        timeFormat: 24,
        name: "Alice Smith",
        avatarUrl: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
        bio: "I am a bio",
        metadata: {
          key: "value",
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${platformOAuthClient.id}/users`)
        .set("x-cal-secret-key", platformOAuthClient.secret)
        .send(requestBody)
        .expect(201);

      const responseBody: CreateManagedUserOutput = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.user.timeZone).toEqual(requestBody.timeZone);
      expect(responseBody.data.user.name).toEqual(requestBody.name);
      await userConnectedToOAuth(platformOAuthClient.id, responseBody.data.user.email, 1);
      platformOrgUser = responseBody.data;
    });

    it(`should create a new platform org manager user using second oAuth client`, async () => {
      const managedUserEmail = `platform-organization-manager-user-${randomString()}@api.com`;
      const requestBody: CreateManagedUserInput = {
        email: managedUserEmail,
        timeZone: "Europe/Berlin",
        weekStart: "Monday",
        timeFormat: 24,
        name: "Alice Smith",
        avatarUrl: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
        bio: "I am a bio",
        metadata: {
          key: "value",
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${secondPlatformOAuthClient.id}/users`)
        .set("x-cal-secret-key", secondPlatformOAuthClient.secret)
        .send(requestBody)
        .expect(201);

      const responseBody: CreateManagedUserOutput = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.user.timeZone).toEqual(requestBody.timeZone);
      expect(responseBody.data.user.name).toEqual(requestBody.name);
      await userConnectedToOAuth(secondPlatformOAuthClient.id, responseBody.data.user.email, 1);
      secondPlatformOrgUser = responseBody.data;
    });
  });

  describe("should create org teams", () => {
    it("should create the team for org", async () => {
      const teamName = `organization team ${randomString()}`;
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams`)
        .set("Authorization", `Bearer ${orgApiKey}`)
        .send({
          name: teamName,
        } satisfies CreateOrgTeamDto)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<Team> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          orgTeam = responseBody.data;
          expect(orgTeam.name).toEqual(teamName);
          expect(orgTeam.parentId).toEqual(org.id);
        });
    });

    it("should create the team for platform org", async () => {
      const teamName = `platform organization team ${randomString()}`;
      return request(app.getHttpServer())
        .post(`/v2/organizations/${platformOrg.id}/teams`)
        .set("x-cal-client-id", platformOAuthClient.id)
        .set("x-cal-secret-key", platformOAuthClient.secret)
        .send({
          name: teamName,
        } satisfies CreateOrgTeamDto)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<Team> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          platformOrgTeam = responseBody.data;
          expect(platformOrgTeam.name).toEqual(teamName);
          expect(platformOrgTeam.parentId).toEqual(platformOrg.id);
        });
    });
  });

  describe("organization memberships", () => {
    describe("negative tests", () => {
      it("should not add managed user to organization", async () => {
        const response = await request(app.getHttpServer())
          .post(`/v2/organizations/${org.id}/memberships`)
          .set("Authorization", `Bearer ${orgApiKey}`)
          .send({
            userId: platformOrgUser.user.id,
            accepted: true,
            role: "MEMBER",
          } satisfies CreateOrgTeamMembershipDto)
          .expect(400);
        expect(response.body.error.message).toEqual(PLATFORM_USER_BEING_ADDED_TO_REGULAR_ORG_ERROR);
      });

      it("should not add managed user to organization team", async () => {
        await request(app.getHttpServer())
          .post(`/v2/organizations/${org.id}/teams/${orgTeam.id}/memberships`)
          .set("Authorization", `Bearer ${orgApiKey}`)
          .send({
            userId: platformOrgUser.user.id,
            accepted: true,
            role: "MEMBER",
          } satisfies CreateOrgTeamMembershipDto)
          .expect(422);
      });

      it("should not add managed user to organization team", async () => {
        const response = await request(app.getHttpServer())
          .post(`/v2/teams/${orgTeam.id}/memberships`)
          .set("Authorization", `Bearer ${orgApiKey}`)
          .send({
            userId: platformOrgUser.user.id,
            accepted: true,
            role: "MEMBER",
          } satisfies CreateOrgTeamMembershipDto)
          .expect(400);
        expect(response.body.error.message).toEqual(PLATFORM_USER_BEING_ADDED_TO_REGULAR_TEAM_ERROR);
      });
    });

    describe("positive tests", () => {
      it("should add user to organization", async () => {
        await request(app.getHttpServer())
          .post(`/v2/organizations/${org.id}/memberships`)
          .set("Authorization", `Bearer ${orgApiKey}`)
          .send({
            userId: orgUser.id,
            accepted: true,
            role: "MEMBER",
          } satisfies CreateOrgTeamMembershipDto)
          .expect(201);
      });

      it("should add user to organization team", async () => {
        await request(app.getHttpServer())
          .post(`/v2/organizations/${org.id}/teams/${orgTeam.id}/memberships`)
          .set("Authorization", `Bearer ${orgApiKey}`)
          .send({
            userId: orgUser.id,
            accepted: true,
            role: "MEMBER",
          } satisfies CreateOrgTeamMembershipDto)
          .expect(201);
      });
    });
  });

  describe("platform organization memberships", () => {
    describe("negative tests", () => {
      it("should not add user to platform organization", async () => {
        const response = await request(app.getHttpServer())
          .post(`/v2/organizations/${platformOrg.id}/memberships`)
          .set("x-cal-client-id", platformOAuthClient.id)
          .set("x-cal-secret-key", platformOAuthClient.secret)
          .send({
            userId: orgUser.id,
            accepted: true,
            role: "MEMBER",
          } satisfies CreateOrgTeamMembershipDto)
          .expect(400);
        expect(response.body.error.message).toEqual(REGULAR_USER_BEING_ADDED_TO_PLATFORM_ORG_ERROR);
      });

      it("should not add user to platform organization team", async () => {
        await request(app.getHttpServer())
          .post(`/v2/organizations/${platformOrg.id}/teams/${platformOrgTeam.id}/memberships`)
          .set("x-cal-client-id", platformOAuthClient.id)
          .set("x-cal-secret-key", platformOAuthClient.secret)
          .send({
            userId: orgUser.id,
            accepted: true,
            role: "MEMBER",
          } satisfies CreateOrgTeamMembershipDto)
          .expect(422);
      });
      it("should not add user to platform organization team", async () => {
        const response = await request(app.getHttpServer())
          .post(`/v2/teams/${platformOrgTeam.id}/memberships`)
          .set("x-cal-client-id", platformOAuthClient.id)
          .set("x-cal-secret-key", platformOAuthClient.secret)
          .send({
            userId: orgUser.id,
            accepted: true,
            role: "MEMBER",
          } satisfies CreateOrgTeamMembershipDto)
          .expect(400);
        expect(response.body.error.message).toEqual(REGULAR_USER_BEING_ADDED_TO_PLATFORM_TEAM_ERROR);
      });

      it("should not add user to platform organization team because user is created using different oAuth client", async () => {
        const response = await request(app.getHttpServer())
          .post(`/v2/organizations/${platformOrg.id}/teams/${platformOrgTeam.id}/memberships`)
          .set("x-cal-client-id", platformOAuthClient.id)
          .set("x-cal-secret-key", platformOAuthClient.secret)
          .send({
            userId: secondPlatformOrgUser.user.id,
            accepted: true,
            role: "MEMBER",
          } satisfies CreateOrgTeamMembershipDto)
          .expect(400);
        expect(response.body.error.message).toEqual(
          PLATFORM_USER_AND_PLATFORM_TEAM_CREATED_WITH_DIFFERENT_OAUTH_CLIENTS_ERROR
        );
      });
    });

    describe("positive tests", () => {
      it("should add user to organization", async () => {
        await request(app.getHttpServer())
          .post(`/v2/organizations/${platformOrg.id}/memberships`)
          .set("x-cal-client-id", platformOAuthClient.id)
          .set("x-cal-secret-key", platformOAuthClient.secret)
          .send({
            userId: platformOrgUser.user.id,
            accepted: true,
            role: "MEMBER",
          } satisfies CreateOrgTeamMembershipDto)
          .expect(201);
      });

      it("should add user to organization team", async () => {
        await request(app.getHttpServer())
          .post(`/v2/organizations/${platformOrg.id}/teams/${platformOrgTeam.id}/memberships`)
          .set("x-cal-client-id", platformOAuthClient.id)
          .set("x-cal-secret-key", platformOAuthClient.secret)
          .send({
            userId: platformOrgUser.user.id,
            accepted: true,
            role: "MEMBER",
          } satisfies CreateOrgTeamMembershipDto)
          .expect(201);
      });
    });
  });

  async function userConnectedToOAuth(oAuthClientId: string, userEmail: string, usersCount: number) {
    const oAuthUsers = await oauthClientRepositoryFixture.getUsers(oAuthClientId);
    const newOAuthUser = oAuthUsers?.find((user) => user.email === userEmail);

    expect(oAuthUsers?.length).toEqual(usersCount);
    expect(newOAuthUser?.email).toEqual(userEmail);
  }

  afterAll(async () => {
    await organizationsRepositoryFixture.delete(org.id);
    await teamsRepositoryFixture.delete(orgTeam.id);
    await organizationsRepositoryFixture.delete(platformOrg.id);
    await teamsRepositoryFixture.delete(platformOrgTeam.id);
    await userRepositoryFixture.deleteByEmail(platformOrgUser.user.email);
    await userRepositoryFixture.deleteByEmail(orgUser.email);
    await userRepositoryFixture.deleteByEmail(orgOwner.email);
    await userRepositoryFixture.deleteByEmail(platformOrgOwner.email);
    await userRepositoryFixture.deleteByEmail(secondPlatformOrgUser.user.email);
    await app.close();
  });
});
