import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { UserOooOutputDto } from "@/modules/ooo/outputs/ooo.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Teams OOO Endpoints", () => {
  describe("User Authentication - User is Team Admin", () => {
    let app: INestApplication;
    let oooCreatedViaApiId: number;
    let userRepositoryFixture: UserRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let team: Team;
    let otherTeam: Team;

    const adminEmail = `teams-ooo-admin-${randomString()}@api.com`;
    let teamAdmin: User;

    const member1Email = `teams-ooo-member1-${randomString()}@api.com`;
    const member2Email = `teams-ooo-member2-${randomString()}@api.com`;
    const outsiderEmail = `teams-ooo-outsider-${randomString()}@api.com`;
    let member1: User;
    let member2: User;
    let outsider: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        adminEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      teamAdmin = await userRepositoryFixture.create({
        email: adminEmail,
        username: adminEmail,
      });

      member1 = await userRepositoryFixture.create({
        email: member1Email,
        username: member1Email,
      });

      member2 = await userRepositoryFixture.create({
        email: member2Email,
        username: member2Email,
      });

      outsider = await userRepositoryFixture.create({
        email: outsiderEmail,
        username: outsiderEmail,
      });

      team = await teamsRepositoryFixture.create({
        name: `teams-ooo-team-${randomString()}`,
        isOrganization: false,
      });

      otherTeam = await teamsRepositoryFixture.create({
        name: `teams-ooo-other-team-${randomString()}`,
        isOrganization: false,
      });

      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: teamAdmin.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: member1.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: member2.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: outsider.id } },
        team: { connect: { id: otherTeam.id } },
        accepted: true,
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(teamsRepositoryFixture).toBeDefined();
      expect(teamAdmin).toBeDefined();
      expect(team).toBeDefined();
    });

    it("should create a ooo entry without redirect", async () => {
      const body = {
        start: "2025-05-01T01:00:00.000Z",
        end: "2025-05-10T13:59:59.999Z",
        notes: "ooo numero uno",
      };

      return request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/users/${member1.id}/ooo`)
        .send(body)
        .expect(201)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data as UserOooOutputDto;
          expect(data.reason).toEqual("unspecified");
          expect(data.userId).toEqual(member1.id);
          expect(data.start).toEqual("2025-05-01T00:00:00.000Z");
          expect(data.end).toEqual("2025-05-10T23:59:59.999Z");
          oooCreatedViaApiId = data.id;
        });
    });

    it("should create a ooo entry with redirect to teammate", async () => {
      const body = {
        start: "2025-08-01T01:00:00.000Z",
        end: "2025-10-10T13:59:59.999Z",
        notes: "ooo with redirect",
        toUserId: member2.id,
      };

      return request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/users/${member1.id}/ooo`)
        .send(body)
        .expect(201)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data as UserOooOutputDto;
          expect(data.reason).toEqual("unspecified");
          expect(data.userId).toEqual(member1.id);
          expect(data.start).toEqual("2025-08-01T00:00:00.000Z");
          expect(data.end).toEqual("2025-10-10T23:59:59.999Z");
          expect(data.toUserId).toEqual(member2.id);
        });
    });

    it("should fail to create a ooo entry with start after end", async () => {
      const body = {
        start: "2025-07-01T00:00:00.000Z",
        end: "2025-05-10T23:59:59.999Z",
        notes: "invalid dates",
      };

      return request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/users/${member1.id}/ooo`)
        .send(body)
        .expect(400);
    });

    it("should fail to create a duplicate ooo entry", async () => {
      const body = {
        start: "2025-05-01T00:00:00.000Z",
        end: "2025-05-10T23:59:59.999Z",
        notes: "duplicate",
      };

      return request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/users/${member1.id}/ooo`)
        .send(body)
        .expect(409);
    });

    it("should fail to create an ooo entry that redirects to self", async () => {
      const body = {
        start: "2025-05-02T00:00:00.000Z",
        end: "2025-05-03T23:59:59.999Z",
        notes: "self redirect",
        toUserId: member1.id,
      };

      return request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/users/${member1.id}/ooo`)
        .send(body)
        .expect(400);
    });

    it("should fail to create an ooo entry that redirects to outsider", async () => {
      const body = {
        start: "2025-05-02T00:00:00.000Z",
        end: "2025-05-03T23:59:59.999Z",
        notes: "outsider redirect",
        toUserId: outsider.id,
      };

      return request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/users/${member1.id}/ooo`)
        .send(body)
        .expect(400);
    });

    it("should fail when target user is not in the team", async () => {
      const body = {
        start: "2025-11-01T00:00:00.000Z",
        end: "2025-11-10T23:59:59.999Z",
        notes: "outsider ooo",
      };

      return request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/users/${outsider.id}/ooo`)
        .send(body)
        .expect(403);
    });

    it("should update a ooo entry", async () => {
      const body = {
        start: "2025-06-01T01:00:00.000Z",
        end: "2025-06-10T13:59:59.999Z",
        notes: "updated ooo",
        reason: "vacation",
      };

      return request(app.getHttpServer())
        .patch(`/v2/teams/${team.id}/users/${member1.id}/ooo/${oooCreatedViaApiId}`)
        .send(body)
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data as UserOooOutputDto;
          expect(data.reason).toEqual("vacation");
          expect(data.userId).toEqual(member1.id);
          expect(data.start).toEqual("2025-06-01T00:00:00.000Z");
          expect(data.end).toEqual("2025-06-10T23:59:59.999Z");
        });
    });

    it("should fail to update a ooo entry with start after end", async () => {
      const body = {
        start: "2025-07-01T00:00:00.000Z",
        end: "2025-05-10T23:59:59.999Z",
      };

      return request(app.getHttpServer())
        .patch(`/v2/teams/${team.id}/users/${member1.id}/ooo/${oooCreatedViaApiId}`)
        .send(body)
        .expect(400);
    });

    it("should fail to update a ooo entry with redirect to self", async () => {
      const body = {
        toUserId: member1.id,
      };

      return request(app.getHttpServer())
        .patch(`/v2/teams/${team.id}/users/${member1.id}/ooo/${oooCreatedViaApiId}`)
        .send(body)
        .expect(400);
    });

    it("should fail to update a non-existent ooo entry", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/teams/${team.id}/users/${member1.id}/ooo/999999`)
        .send({ notes: "does not exist" })
        .expect(403);
    });

    it("should fail to delete a non-existent ooo entry", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/teams/${team.id}/users/${member1.id}/ooo/999999`)
        .expect(403);
    });

    it("should update a ooo entry with redirect to teammate", async () => {
      const body = {
        toUserId: member2.id,
      };

      return request(app.getHttpServer())
        .patch(`/v2/teams/${team.id}/users/${member1.id}/ooo/${oooCreatedViaApiId}`)
        .send(body)
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data as UserOooOutputDto;
          expect(data.reason).toEqual("vacation");
          expect(data.toUserId).toEqual(member2.id);
          expect(data.userId).toEqual(member1.id);
          expect(data.start).toEqual("2025-06-01T00:00:00.000Z");
          expect(data.end).toEqual("2025-06-10T23:59:59.999Z");
        });
    });

    it("should get 2 ooo entries", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/users/${member1.id}/ooo`)
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data as UserOooOutputDto[];
          expect(data.length).toEqual(2);
          const oooUno = data.find((ooo) => ooo.id === oooCreatedViaApiId);
          expect(oooUno).toBeDefined();
          if (oooUno) {
            expect(oooUno.reason).toEqual("vacation");
            expect(oooUno.toUserId).toEqual(member2.id);
            expect(oooUno.userId).toEqual(member1.id);
            expect(oooUno.start).toEqual("2025-06-01T00:00:00.000Z");
            expect(oooUno.end).toEqual("2025-06-10T23:59:59.999Z");
          }
        });
    });

    it("should get ooo entries with sorting", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/users/${member1.id}/ooo?sortEnd=desc`)
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data as UserOooOutputDto[];
          expect(data.length).toEqual(2);
          expect(data[1].id).toEqual(oooCreatedViaApiId);
        });
    });

    it("should delete ooo entry", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/teams/${team.id}/users/${member1.id}/ooo/${oooCreatedViaApiId}`)
        .expect(200);
    });

    it("should have 1 ooo entry after deletion", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/users/${member1.id}/ooo`)
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data as UserOooOutputDto[];
          expect(data.length).toEqual(1);
        });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(teamAdmin.email);
      await userRepositoryFixture.deleteByEmail(member1.email);
      await userRepositoryFixture.deleteByEmail(member2.email);
      await userRepositoryFixture.deleteByEmail(outsider.email);
      await teamsRepositoryFixture.delete(team.id);
      await teamsRepositoryFixture.delete(otherTeam.id);
      await app.close();
    });
  });

  describe("User Authentication - User is Team Member (non-admin)", () => {
    let app: INestApplication;
    let userRepositoryFixture: UserRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let team: Team;

    const memberEmail = `teams-ooo-nonadmin-${randomString()}@api.com`;
    let member: User;

    const targetMemberEmail = `teams-ooo-target-${randomString()}@api.com`;
    let targetMember: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        memberEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      member = await userRepositoryFixture.create({
        email: memberEmail,
        username: memberEmail,
      });

      targetMember = await userRepositoryFixture.create({
        email: targetMemberEmail,
        username: targetMemberEmail,
      });

      team = await teamsRepositoryFixture.create({
        name: `teams-ooo-nonadmin-team-${randomString()}`,
        isOrganization: false,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: member.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: targetMember.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should reject a non-admin member from listing team member OOO entries", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/users/${targetMember.id}/ooo`)
        .expect(403);
    });

    it("should reject a non-admin member from creating team member OOO entries", async () => {
      const body = {
        start: "2025-05-01T00:00:00.000Z",
        end: "2025-05-10T23:59:59.999Z",
        notes: "should be rejected",
      };

      return request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/users/${targetMember.id}/ooo`)
        .send(body)
        .expect(403);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(member.email);
      await userRepositoryFixture.deleteByEmail(targetMember.email);
      await teamsRepositoryFixture.delete(team.id);
      await app.close();
    });
  });
});
