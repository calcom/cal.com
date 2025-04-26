import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { StripeService } from "@/modules/stripe/stripe.service";
import { CreateTeamInput } from "@/modules/teams/teams/inputs/create-team.input";
import { UpdateTeamDto } from "@/modules/teams/teams/inputs/update-team.input";
import { CreateTeamOutput } from "@/modules/teams/teams/outputs/teams/create-team.output";
import { GetTeamOutput } from "@/modules/teams/teams/outputs/teams/get-team.output";
import { GetTeamsOutput } from "@/modules/teams/teams/outputs/teams/get-teams.output";
import { TeamsModule } from "@/modules/teams/teams/teams.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "next-auth";
import Stripe from "stripe";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { slugify } from "@calcom/platform-libraries";
import { TeamOutputDto } from "@calcom/platform-types";

describe("Teams endpoint", () => {
  let app: INestApplication;
  let userRepositoryFixture: UserRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let membershipRepositoryFixture: MembershipRepositoryFixture;

  const aliceEmail = `alice-${randomString()}@api.com`;
  let alice: User;
  let aliceApiKey: string;

  const bobEmail = `bob-${randomString()}@api.com`;
  let bob: User;
  let bobApiKey: string;

  let team1: TeamOutputDto;
  let team2: TeamOutputDto;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, TeamsModule],
    }).compile();

    jest.spyOn(StripeService.prototype, "getStripe").mockImplementation(() => ({} as unknown as Stripe));

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
    membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

    alice = await userRepositoryFixture.create({
      email: aliceEmail,
    });

    bob = await userRepositoryFixture.create({
      email: bobEmail,
    });

    const { keyString } = await apiKeysRepositoryFixture.createApiKey(alice.id, null);
    aliceApiKey = keyString;

    const { keyString: bobKeyString } = await apiKeysRepositoryFixture.createApiKey(bob.id, null);
    bobApiKey = bobKeyString;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  describe("User has membership in created team", () => {
    it("should create first team", async () => {
      const body: CreateTeamInput = {
        name: `teams dog ${randomString()}`,
        metadata: {
          teamKey: "teamValue",
        },
      };

      return request(app.getHttpServer())
        .post("/v2/teams")
        .send(body)
        .set({ Authorization: `Bearer cal_test_${aliceApiKey}` })
        .expect(201)
        .then(async (response) => {
          const responseBody: CreateTeamOutput = response.body;
          const responseData = responseBody.data as TeamOutputDto;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseData).toBeDefined();
          expect(responseData.id).toBeDefined();
          expect(responseData.name).toEqual(body.name);
          expect(responseData.slug).toEqual(slugify(body.name));
          expect(responseData.metadata).toEqual(body.metadata);
          team1 = responseData;
        });
    });

    it("should not create a team with string metadata", async () => {
      const body = {
        name: `teams-dog-${randomString()}`,
        metadata: JSON.stringify({
          teamKey: "teamValue",
        }),
      };

      return request(app.getHttpServer())
        .post("/v2/teams")
        .send(body)
        .set({ Authorization: `Bearer cal_test_${aliceApiKey}` })
        .expect(400);
    });

    it("should create second team", async () => {
      const body: CreateTeamInput = {
        name: `teams-cats-${randomString()}`,
        metadata: {},
      };

      return request(app.getHttpServer())
        .post("/v2/teams")
        .send(body)
        .set({ Authorization: `Bearer cal_test_${aliceApiKey}` })
        .expect(201)
        .then(async (response) => {
          const responseBody: CreateTeamOutput = response.body;
          const responseData = responseBody.data as TeamOutputDto;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseData).toBeDefined();
          expect(responseData.id).toBeDefined();
          expect(responseData.name).toEqual(body.name);
          expect(responseData.metadata).toEqual(body.metadata);
          team2 = responseData;
        });
    });

    it("should get a team", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team1.id}`)
        .set({ Authorization: `Bearer cal_test_${aliceApiKey}` })
        .expect(200)
        .then(async (response) => {
          const responseBody: GetTeamOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.id).toBeDefined();
          expect(responseBody.data.name).toEqual(team1.name);
        });
    });

    it("should get teams", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams`)
        .set({ Authorization: `Bearer cal_test_${aliceApiKey}` })
        .expect(200)
        .then(async (response) => {
          const responseBody: GetTeamsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.length).toEqual(2);

          const responseTeam1 = responseBody.data.find((team) => team.id === team1.id);
          const responseTeam2 = responseBody.data.find((team) => team.id === team2.id);

          expect(responseTeam1).toBeDefined();
          expect(responseTeam2).toBeDefined();
        });
    });

    it("should update a team", async () => {
      const body: UpdateTeamDto = {
        name: `teams-dogs-shepherds-${randomString()}`,
        metadata: {
          teamKey: `teamValue ${randomString()}`,
        },
      };

      return request(app.getHttpServer())
        .patch(`/v2/teams/${team1.id}`)
        .send(body)
        .set({ Authorization: `Bearer cal_test_${aliceApiKey}` })
        .expect(200)
        .then(async (response) => {
          const responseBody: GetTeamOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.id).toBeDefined();
          expect(responseBody.data.name).toEqual(body.name);
          expect(responseBody.data.metadata).toEqual(body.metadata);
          team1 = responseBody.data;
        });
    });
  });

  describe("User does not have membership in created team", () => {
    it("should not be able to get a team", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team2.id}`)
        .set({ Authorization: `Bearer cal_test_${bobApiKey}` })
        .expect(403);
    });
  });

  describe("User does not have sufficient membership in created team", () => {
    it("should not be able to delete a team", async () => {
      await membershipRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: bob.id } },
        team: { connect: { id: team2.id } },
        accepted: true,
      });
      return request(app.getHttpServer())
        .delete(`/v2/teams/${team2.id}`)
        .set({ Authorization: `Bearer cal_test_${bobApiKey}` })
        .expect(403);
    });
  });

  describe("Delete teams", () => {
    it("should delete team", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/teams/${team1.id}`)
        .set({ Authorization: `Bearer cal_test_${aliceApiKey}` })
        .expect(200)
        .then(async (response) => {
          const responseBody: GetTeamOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.id).toBeDefined();
          expect(responseBody.data.name).toEqual(team1.name);
        });
    });

    it("should delete team", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/teams/${team2.id}`)
        .set({ Authorization: `Bearer cal_test_${aliceApiKey}` })
        .expect(200)
        .then(async (response) => {
          const responseBody: GetTeamOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.id).toBeDefined();
          expect(responseBody.data.name).toEqual(team2.name);
        });
    });
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(aliceEmail);
    await userRepositoryFixture.deleteByEmail(bobEmail);
    await teamRepositoryFixture.delete(team1.id);
    await teamRepositoryFixture.delete(team2.id);
    await app.close();
  });
});
