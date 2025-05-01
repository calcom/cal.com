import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateOrgMembershipDto } from "@/modules/organizations/memberships/inputs/create-organization-membership.input";
import { UpdateOrgMembershipDto } from "@/modules/organizations/memberships/inputs/update-organization-membership.input";
import { CreateOrgMembershipOutput } from "@/modules/organizations/memberships/outputs/create-membership.output";
import { DeleteOrgMembership } from "@/modules/organizations/memberships/outputs/delete-membership.output";
import { GetAllOrgMemberships } from "@/modules/organizations/memberships/outputs/get-all-memberships.output";
import { GetOrgMembership } from "@/modules/organizations/memberships/outputs/get-membership.output";
import { UpdateOrgMembership } from "@/modules/organizations/memberships/outputs/update-membership.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TeamMembershipOutput } from "@/modules/teams/memberships/outputs/team-membership.output";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiSuccessResponse } from "@calcom/platform-types";
import { Membership, Team } from "@calcom/prisma/client";

describe("Organizations Memberships Endpoints", () => {
  describe("User Authentication - User is Org Admin", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let membership: Membership;
    let membership2: Membership;
    let membershipCreatedViaApi: TeamMembershipOutput;

    const userEmail = `organizations-memberships-admin-${randomString()}@api.com`;
    const userEmail2 = `organizations-memberships-member-${randomString()}@api.com`;
    const invitedUserEmail = `organizations-memberships-invited-${randomString()}@api.com`;

    let user: User;
    let user2: User;

    let userToInviteViaApi: User;

    const metadata = {
      some: "key",
    };
    const bio = "This is a bio";

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        bio,
        metadata,
      });
      user2 = await userRepositoryFixture.create({
        email: userEmail2,
        username: userEmail2,
        bio,
        metadata,
      });

      userToInviteViaApi = await userRepositoryFixture.create({
        email: invitedUserEmail,
        username: invitedUserEmail,
        bio,
        metadata,
      });

      org = await organizationsRepositoryFixture.create({
        name: `organizations-memberships-organization-${randomString()}`,
        isOrganization: true,
      });

      membership = await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
      });

      membership2 = await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user2.id } },
        team: { connect: { id: org.id } },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(organizationsRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
      expect(org).toBeDefined();
    });

    it("should get all the memberships of the org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships`)
        .expect(200)
        .then((response) => {
          const responseBody: GetAllOrgMemberships = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data[0].id).toEqual(membership.id);
          expect(responseBody.data[0].userId).toEqual(user.id);
          expect(responseBody.data[0].role).toEqual("ADMIN");
          expect(responseBody.data[0].user.bio).toEqual(bio);
          expect(responseBody.data[0].user.metadata).toEqual(metadata);
          expect(responseBody.data[0].user.email).toEqual(user.email);
          expect(responseBody.data[0].user.username).toEqual(user.username);
          expect(responseBody.data[0].teamId).toEqual(org.id);
          expect(responseBody.data[1].id).toEqual(membership2.id);
          expect(responseBody.data[1].userId).toEqual(user2.id);
          expect(responseBody.data[1].role).toEqual("MEMBER");
          expect(responseBody.data[1].user.bio).toEqual(bio);
          expect(responseBody.data[1].user.metadata).toEqual(metadata);
          expect(responseBody.data[1].user.email).toEqual(user2.email);
          expect(responseBody.data[1].user.username).toEqual(user2.username);
          expect(responseBody.data[1].teamId).toEqual(org.id);
        });
    });

    it("should get all the memberships of the org paginated", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships?skip=1&take=1`)
        .expect(200)
        .then((response) => {
          const responseBody: GetAllOrgMemberships = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data[0].id).toEqual(membership2.id);
          expect(responseBody.data[0].role).toEqual("MEMBER");
          expect(responseBody.data[0].user.bio).toEqual(bio);
          expect(responseBody.data[0].user.metadata).toEqual(metadata);
          expect(responseBody.data[0].user.email).toEqual(user2.email);
          expect(responseBody.data[0].user.username).toEqual(user2.username);
          expect(responseBody.data[0].userId).toEqual(user2.id);
          expect(responseBody.data[0].teamId).toEqual(org.id);
        });
    });

    it("should fail if org does not exist", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/120494059/memberships`).expect(403);
    });

    it("should get the membership of the org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships/${membership.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: GetOrgMembership = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(membership.id);
          expect(responseBody.data.userId).toEqual(user.id);
          expect(responseBody.data.role).toEqual("ADMIN");
          expect(responseBody.data.user.bio).toEqual(bio);
          expect(responseBody.data.user.metadata).toEqual(metadata);
          expect(responseBody.data.user.email).toEqual(user.email);
          expect(responseBody.data.user.username).toEqual(user.username);
          expect(responseBody.data.teamId).toEqual(org.id);
        });
    });

    it("should create the membership of the org", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/memberships`)
        .send({
          userId: userToInviteViaApi.id,
          accepted: true,
          role: "MEMBER",
        } satisfies CreateOrgMembershipDto)
        .expect(201)
        .then((response) => {
          const responseBody: CreateOrgMembershipOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          membershipCreatedViaApi = responseBody.data;
          expect(membershipCreatedViaApi.teamId).toEqual(org.id);
          expect(membershipCreatedViaApi.role).toEqual("MEMBER");
          expect(membershipCreatedViaApi.userId).toEqual(userToInviteViaApi.id);
          expect(membershipCreatedViaApi.user.bio).toEqual(bio);
          expect(membershipCreatedViaApi.user.metadata).toEqual(metadata);
          expect(membershipCreatedViaApi.user.email).toEqual(userToInviteViaApi.email);
          expect(membershipCreatedViaApi.user.username).toEqual(userToInviteViaApi.username);
        });
    });

    it("should update the membership of the org", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/memberships/${membershipCreatedViaApi.id}`)
        .send({
          role: "OWNER",
        } satisfies UpdateOrgMembershipDto)
        .expect(200)
        .then((response) => {
          const responseBody: UpdateOrgMembership = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          membershipCreatedViaApi = responseBody.data;
          expect(membershipCreatedViaApi.role).toEqual("OWNER");
        });
    });

    it("should delete the membership of the org we created via api", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/memberships/${membershipCreatedViaApi.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: DeleteOrgMembership = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(membershipCreatedViaApi.id);
        });
    });

    it("should fail to get the membership of the org we just deleted", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships/${membershipCreatedViaApi.id}`)
        .expect(404);
    });

    it("should fail if the membership does not exist", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships/123132145`)
        .expect(404);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await userRepositoryFixture.deleteByEmail(user2.email);
      await userRepositoryFixture.deleteByEmail(userToInviteViaApi.email);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});

describe("Organizations Memberships Endpoints", () => {
  describe("User Authentication - User is Org Member", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let membership: Membership;

    const userEmail = `organizations-memberships-member-${randomString()}@api.com`;
    let user: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: `organizations-memberships-organization-${randomString()}`,
        isOrganization: true,
      });

      membership = await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(organizationsRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
      expect(org).toBeDefined();
    });

    it("should deny get all the memberships of the org", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/${org.id}/memberships`).expect(403);
    });

    it("should deny get all the memberships of the org paginated", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships?skip=1&take=1`)
        .expect(403);
    });

    it("should deny get the membership of the org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships/${membership.id}`)
        .expect(403);
    });

    it("should deny create the membership for the org", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/memberships`)
        .send({
          role: "OWNER",
          userId: user.id,
          accepted: true,
        } satisfies CreateOrgMembershipDto)
        .expect(403);
    });

    it("should deny update the membership of the org", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/memberships/${membership.id}`)
        .send({
          role: "MEMBER",
        } satisfies Partial<CreateOrgMembershipDto>)
        .expect(403);
    });

    it("should deny delete the membership of the org we created via api", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/memberships/${membership.id}`)
        .expect(403);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});
