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

describe("User OOO Endpoints", () => {
  describe("User Authentication - Authenticated User", () => {
    let app: INestApplication;
    let oooCreatedViaApiId: number;
    let userRepositoryFixture: UserRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let team: Team;

    const userEmail = `user-ooo-user-${randomString()}@api.com`;
    let user: User;

    const teammate1Email = `user-ooo-teammate1-${randomString()}@api.com`;
    const teammate2Email = `user-ooo-teammate2-${randomString()}@api.com`;
    const outsiderEmail = `user-ooo-outsider-${randomString()}@api.com`;
    let teammate1: User;
    let teammate2: User;
    let outsider: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      teammate1 = await userRepositoryFixture.create({
        email: teammate1Email,
        username: teammate1Email,
      });

      teammate2 = await userRepositoryFixture.create({
        email: teammate2Email,
        username: teammate2Email,
      });

      outsider = await userRepositoryFixture.create({
        email: outsiderEmail,
        username: outsiderEmail,
      });

      team = await teamsRepositoryFixture.create({
        name: `user-ooo-team-${randomString()}`,
        isOrganization: false,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user.id } },
        team: { connect: { id: team.id } },
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

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
      expect(team).toBeDefined();
    });

    it("should create an ooo entry without redirect", async () => {
      const body = {
        start: "2025-05-01T01:00:00.000Z",
        end: "2025-05-10T13:59:59.999Z",
        notes: "my ooo entry",
      };

      return request(app.getHttpServer())
        .post("/v2/me/ooo")
        .send(body)
        .expect(201)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data as UserOooOutputDto;
          expect(data.reason).toEqual("unspecified");
          expect(data.userId).toEqual(user.id);
          expect(data.start).toEqual("2025-05-01T00:00:00.000Z");
          expect(data.end).toEqual("2025-05-10T23:59:59.999Z");
          oooCreatedViaApiId = data.id;
        });
    });

    it("should create an ooo entry with redirect to teammate", async () => {
      const body = {
        start: "2025-08-01T01:00:00.000Z",
        end: "2025-10-10T13:59:59.999Z",
        notes: "ooo with redirect",
        toUserId: teammate1.id,
      };

      return request(app.getHttpServer())
        .post("/v2/me/ooo")
        .send(body)
        .expect(201)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data as UserOooOutputDto;
          expect(data.reason).toEqual("unspecified");
          expect(data.userId).toEqual(user.id);
          expect(data.start).toEqual("2025-08-01T00:00:00.000Z");
          expect(data.end).toEqual("2025-10-10T23:59:59.999Z");
          expect(data.toUserId).toEqual(teammate1.id);
        });
    });

    it("should fail to create an ooo entry with start after end", async () => {
      const body = {
        start: "2025-07-01T00:00:00.000Z",
        end: "2025-05-10T23:59:59.999Z",
        notes: "invalid dates",
      };

      return request(app.getHttpServer()).post("/v2/me/ooo").send(body).expect(400);
    });

    it("should fail to create a duplicate ooo entry", async () => {
      const body = {
        start: "2025-05-01T00:00:00.000Z",
        end: "2025-05-10T23:59:59.999Z",
        notes: "duplicate entry",
      };

      return request(app.getHttpServer()).post("/v2/me/ooo").send(body).expect(409);
    });

    it("should fail to create an ooo entry that redirects to self", async () => {
      const body = {
        start: "2025-05-02T00:00:00.000Z",
        end: "2025-05-03T23:59:59.999Z",
        notes: "self redirect",
        toUserId: user.id,
      };

      return request(app.getHttpServer()).post("/v2/me/ooo").send(body).expect(400);
    });

    it("should fail to create an ooo entry that redirects to user outside of team", async () => {
      const body = {
        start: "2025-05-02T00:00:00.000Z",
        end: "2025-05-03T23:59:59.999Z",
        notes: "invalid redirect",
        toUserId: outsider.id,
      };

      return request(app.getHttpServer()).post("/v2/me/ooo").send(body).expect(400);
    });

    it("should update an ooo entry", async () => {
      const body = {
        start: "2025-06-01T01:00:00.000Z",
        end: "2025-06-10T13:59:59.999Z",
        notes: "updated ooo",
        reason: "vacation",
      };

      return request(app.getHttpServer())
        .patch(`/v2/me/ooo/${oooCreatedViaApiId}`)
        .send(body)
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data as UserOooOutputDto;
          expect(data.reason).toEqual("vacation");
          expect(data.userId).toEqual(user.id);
          expect(data.start).toEqual("2025-06-01T00:00:00.000Z");
          expect(data.end).toEqual("2025-06-10T23:59:59.999Z");
        });
    });

    it("should fail to update an ooo entry with start after end", async () => {
      const body = {
        start: "2025-07-01T00:00:00.000Z",
        end: "2025-05-10T23:59:59.999Z",
      };

      return request(app.getHttpServer()).patch(`/v2/me/ooo/${oooCreatedViaApiId}`).send(body).expect(400);
    });

    it("should fail to update an ooo entry with redirect to self", async () => {
      const body = {
        toUserId: user.id,
      };

      return request(app.getHttpServer()).patch(`/v2/me/ooo/${oooCreatedViaApiId}`).send(body).expect(400);
    });

    it("should fail to update a non-existent ooo entry", async () => {
      return request(app.getHttpServer())
        .patch("/v2/me/ooo/999999")
        .send({ notes: "does not exist" })
        .expect(403);
    });

    it("should fail to delete a non-existent ooo entry", async () => {
      return request(app.getHttpServer()).delete("/v2/me/ooo/999999").expect(403);
    });

    it("should update an ooo entry with redirect to teammate", async () => {
      const body = {
        toUserId: teammate2.id,
      };

      return request(app.getHttpServer())
        .patch(`/v2/me/ooo/${oooCreatedViaApiId}`)
        .send(body)
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data as UserOooOutputDto;
          expect(data.reason).toEqual("vacation");
          expect(data.toUserId).toEqual(teammate2.id);
          expect(data.userId).toEqual(user.id);
        });
    });

    it("should get all ooo entries for the authenticated user", async () => {
      return request(app.getHttpServer())
        .get("/v2/me/ooo")
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data as UserOooOutputDto[];
          expect(data.length).toEqual(2);
          const oooEntry = data.find((ooo) => ooo.id === oooCreatedViaApiId);
          expect(oooEntry).toBeDefined();
          if (oooEntry) {
            expect(oooEntry.reason).toEqual("vacation");
            expect(oooEntry.toUserId).toEqual(teammate2.id);
            expect(oooEntry.userId).toEqual(user.id);
          }
        });
    });

    it("should get ooo entries with sort", async () => {
      return request(app.getHttpServer())
        .get("/v2/me/ooo?sortEnd=desc")
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data as UserOooOutputDto[];
          expect(data.length).toEqual(2);
          expect(data[1].id).toEqual(oooCreatedViaApiId);
        });
    });

    it("should delete an ooo entry", async () => {
      return request(app.getHttpServer()).delete(`/v2/me/ooo/${oooCreatedViaApiId}`).expect(200);
    });

    it("user should have 1 ooo entry after deletion", async () => {
      return request(app.getHttpServer())
        .get("/v2/me/ooo")
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data as UserOooOutputDto[];
          expect(data.length).toEqual(1);
        });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await userRepositoryFixture.deleteByEmail(teammate1.email);
      await userRepositoryFixture.deleteByEmail(teammate2.email);
      await userRepositoryFixture.deleteByEmail(outsider.email);
      await teamsRepositoryFixture.delete(team.id);
      await app.close();
    });
  });
});
