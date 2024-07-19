import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateOrgMembershipDto } from "@/modules/organizations/inputs/create-organization-membership.input";
import { UpdateOrgMembershipDto } from "@/modules/organizations/inputs/update-organization-membership.input";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiSuccessResponse } from "@calcom/platform-types";
import { Membership, Team } from "@calcom/prisma/client";

describe("Organizations Memberships Endpoints", () => {
  describe("User Authentication - User is Org Admin", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let membership: Membership;
    let membership2: Membership;
    let membershipCreatedViaApi: Membership;

    const userEmail = "org-admin-membership-controller-e2e@api.com";
    const userEmail2 = "org-member-membership-controller-e2e@api.com";

    const invitedUserEmail = "org-member-invited-membership-controller-e2e@api.com";

    let user: User;
    let user2: User;

    let userToInviteViaApi: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });
      user2 = await userRepositoryFixture.create({
        email: userEmail2,
        username: userEmail2,
      });

      userToInviteViaApi = await userRepositoryFixture.create({
        email: invitedUserEmail,
        username: invitedUserEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: "Test Organization",
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
          const responseBody: ApiSuccessResponse<Membership[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data[0].id).toEqual(membership.id);
          expect(responseBody.data[1].id).toEqual(membership2.id);
        });
    });

    it("should get all the memberships of the org paginated", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships?skip=1&take=1`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<Membership[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data[0].id).toEqual(membership2.id);
          expect(responseBody.data[0].userId).toEqual(user2.id);
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
          const responseBody: ApiSuccessResponse<Membership> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(membership.id);
          expect(responseBody.data.userId).toEqual(user.id);
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
          const responseBody: ApiSuccessResponse<Membership> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          membershipCreatedViaApi = responseBody.data;
          expect(membershipCreatedViaApi.teamId).toEqual(org.id);
          expect(membershipCreatedViaApi.role).toEqual("MEMBER");
          expect(membershipCreatedViaApi.userId).toEqual(userToInviteViaApi.id);
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
          const responseBody: ApiSuccessResponse<Membership> = response.body;
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
          const responseBody: ApiSuccessResponse<Membership> = response.body;
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
    let organizationsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let membership: Membership;

    const userEmail = "org-member-memberships-controller-e2e@api.com";
    let user: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: "Test Organization",
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
