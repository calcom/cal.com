import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
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

describe("Organizations User OOO Endpoints", () => {
  describe("User Authentication - User is Org Admin", () => {
    let app: INestApplication;
    let oooCreatedViaApiId: number;
    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;

    let org: Team;
    let team: Team;
    let falseTestOrg: Team;
    let falseTestTeam: Team;

    const userEmail = `organizations-users-ooo-admin-${randomString()}@api.com`;
    let userAdmin: User;

    const teammate1Email = `organizations-users-ooo-member1-${randomString()}@api.com`;
    const teammate2Email = `organizations-users-ooo-member2-${randomString()}@api.com`;
    const falseTestUserEmail = `organizations-users-ooo-false-user-${randomString()}@api.com`;
    let teammate1: User;
    let teammate2: User;
    let falseTestUser: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);

      userAdmin = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        role: "ADMIN",
      });

      teammate1 = await userRepositoryFixture.create({
        email: teammate1Email,
        username: teammate1Email,
      });

      teammate2 = await userRepositoryFixture.create({
        email: teammate2Email,
        username: teammate2Email,
      });

      falseTestUser = await userRepositoryFixture.create({
        email: falseTestUserEmail,
        username: falseTestUserEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: `organizations-users-ooo-organization-${randomString()}`,
        isOrganization: true,
      });

      falseTestOrg = await organizationsRepositoryFixture.create({
        name: `organizations-users-ooo-false-org-${randomString()}`,
        isOrganization: true,
      });

      team = await teamsRepositoryFixture.create({
        name: `organizations-users-ooo-team-${randomString()}`,
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      falseTestTeam = await teamsRepositoryFixture.create({
        name: `organizations-users-ooo-false-team-${randomString()}`,
        isOrganization: false,
        parent: { connect: { id: falseTestOrg.id } },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${userAdmin.id}`,
        username: userEmail,
        organization: {
          connect: {
            id: org.id,
          },
        },
        user: {
          connect: {
            id: userAdmin.id,
          },
        },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${teammate1.id}`,
        username: teammate1Email,
        organization: {
          connect: {
            id: org.id,
          },
        },
        user: {
          connect: {
            id: teammate1.id,
          },
        },
      });

      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: userAdmin.id } },
        team: { connect: { id: org.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teammate1.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teammate2.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: falseTestUser.id } },
        team: { connect: { id: falseTestTeam.id } },
        accepted: true,
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(organizationsRepositoryFixture).toBeDefined();
      expect(userAdmin).toBeDefined();
      expect(org).toBeDefined();
    });

    it("should create a ooo entry without redirect", async () => {
      const body = {
        start: "2025-05-01T01:00:00.000Z",
        end: "2025-05-10T13:59:59.999Z",
        notes: "ooo numero uno",
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo`)
        .send(body)
        .expect(201)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data as UserOooOutputDto;
          expect(data.reason).toEqual("unspecified");
          expect(data.userId).toEqual(teammate1.id);
          expect(data.start).toEqual("2025-05-01T00:00:00.000Z");
          expect(data.end).toEqual("2025-05-10T23:59:59.999Z");
          oooCreatedViaApiId = data.id;
        });
    });

    it("should create a ooo entry with redirect", async () => {
      const body = {
        start: "2025-08-01T01:00:00.000Z",
        end: "2025-10-10T13:59:59.999Z",
        notes: "ooo numero dos with redirect",
        toUserId: teammate2.id,
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo`)
        .send(body)
        .expect(201)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data as UserOooOutputDto;
          expect(data.reason).toEqual("unspecified");
          expect(data.userId).toEqual(teammate1.id);
          expect(data.start).toEqual("2025-08-01T00:00:00.000Z");
          expect(data.end).toEqual("2025-10-10T23:59:59.999Z");
          expect(data.toUserId).toEqual(teammate2.id);
        });
    });

    it("should fail to create a ooo entry with start after end", async () => {
      const body = {
        start: "2025-07-01T00:00:00.000Z",
        end: "2025-05-10T23:59:59.999Z",
        notes: "ooo numero uno duplicate",
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo`)
        .send(body)
        .expect(400);
    });

    it("should fail to create a duplicate ooo entry", async () => {
      const body = {
        start: "2025-05-01T00:00:00.000Z",
        end: "2025-05-10T23:59:59.999Z",
        notes: "ooo numero uno duplicate",
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo`)
        .send(body)
        .expect(409);
    });

    it("should fail to create an ooo entry that redirects to self", async () => {
      const body = {
        start: "2025-05-02T00:00:00.000Z",
        end: "2025-05-03T23:59:59.999Z",
        notes: "ooo infinite redirect",
        toUserId: teammate1.id,
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo`)
        .send(body)
        .expect(400);
    });

    it("should fail to create an ooo entry that redirects to member outside of org", async () => {
      const body = {
        start: "2025-05-02T00:00:00.000Z",
        end: "2025-05-03T23:59:59.999Z",
        notes: "ooo invalid redirect",
        toUserId: falseTestUser.id,
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo`)
        .send(body)
        .expect(400);
    });

    it("should update a ooo entry without redirect", async () => {
      const body = {
        start: "2025-06-01T01:00:00.000Z",
        end: "2025-06-10T13:59:59.999Z",
        notes: "ooo numero uno",
        reason: "vacation",
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo/${oooCreatedViaApiId}`)
        .send(body)
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data as UserOooOutputDto;
          expect(data.reason).toEqual("vacation");
          expect(data.userId).toEqual(teammate1.id);
          expect(data.start).toEqual("2025-06-01T00:00:00.000Z");
          expect(data.end).toEqual("2025-06-10T23:59:59.999Z");
        });
    });

    it("should fail to update a ooo entry with redirect outside of org", async () => {
      const body = {
        toUserId: falseTestUser.id,
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo/${oooCreatedViaApiId}`)
        .send(body)
        .expect(400);
    });

    it("should fail to update a ooo entry with start after end ", async () => {
      const body = {
        start: "2025-07-01T00:00:00.000Z",
        end: "2025-05-10T23:59:59.999Z",
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo/${oooCreatedViaApiId}`)
        .send(body)
        .expect(400);
    });

    it("should fail to update a ooo entry with redirect to self ", async () => {
      const body = {
        toUserId: teammate1.id,
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo/${oooCreatedViaApiId}`)
        .send(body)
        .expect(400);
    });

    it("should fail to update a ooo entry with duplicate time", async () => {
      const body = {
        start: "2025-06-01T01:00:00.000Z",
        end: "2025-06-10T13:59:59.999Z",
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo/${oooCreatedViaApiId}`)
        .send(body)
        .expect(409);
    });

    it("should update a ooo entry without redirect", async () => {
      const body = {
        toUserId: teammate2.id,
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo/${oooCreatedViaApiId}`)
        .send(body)
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data as UserOooOutputDto;
          expect(data.reason).toEqual("vacation");
          expect(data.toUserId).toEqual(teammate2.id);
          expect(data.userId).toEqual(teammate1.id);
          expect(data.start).toEqual("2025-06-01T00:00:00.000Z");
          expect(data.end).toEqual("2025-06-10T23:59:59.999Z");
        });
    });

    it("should get 2 ooo entries", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/ooo?sortEnd=desc&email=${teammate1Email}`)
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
            expect(oooUno.toUserId).toEqual(teammate2.id);
            expect(oooUno.userId).toEqual(teammate1.id);
            expect(oooUno.start).toEqual("2025-06-01T00:00:00.000Z");
            expect(oooUno.end).toEqual("2025-06-10T23:59:59.999Z");
          }
          // test sort
          expect(data[1].id).toEqual(oooCreatedViaApiId);
        });
    });

    it("should get 2 ooo entries", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo`)
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
            expect(oooUno.toUserId).toEqual(teammate2.id);
            expect(oooUno.userId).toEqual(teammate1.id);
            expect(oooUno.start).toEqual("2025-06-01T00:00:00.000Z");
            expect(oooUno.end).toEqual("2025-06-10T23:59:59.999Z");
          }
        });
    });

    it("should delete ooo entry", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo/${oooCreatedViaApiId}`)
        .expect(200);
    });

    it("user should have 1 ooo entries", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/users/${teammate1.id}/ooo`)
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data as UserOooOutputDto[];
          expect(data.length).toEqual(1);
        });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(userAdmin.email);
      await userRepositoryFixture.deleteByEmail(teammate1.email);
      await userRepositoryFixture.deleteByEmail(teammate2.email);
      await userRepositoryFixture.deleteByEmail(falseTestUser.email);
      await teamsRepositoryFixture.delete(team.id);
      await teamsRepositoryFixture.delete(falseTestTeam.id);
      await organizationsRepositoryFixture.delete(org.id);
      await organizationsRepositoryFixture.delete(falseTestOrg.id);
      await app.close();
    });
  });
});
