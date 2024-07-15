import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  ApiSuccessResponse,
  CreateTeamEventTypeInput_2024_06_14,
  TeamEventTypeOutput_2024_06_14,
} from "@calcom/platform-types";
import { Team } from "@calcom/prisma/client";

describe("Organizations Event Types Endpoints", () => {
  describe("User Authentication - User is Org Admin", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: TeamRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;

    let org: Team;
    let team: Team;

    const userEmail = "org-admin-event-types-controller-e2e@api.com";
    let userAdmin: User;

    const teammate1Email = "teammate1@team.com";
    const teammate2Email = "teammate2@team.com";
    let teammate1: User;
    let teammate2: User;

    let teamEventType: TeamEventTypeOutput_2024_06_14;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
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

      org = await organizationsRepositoryFixture.create({
        name: "Test Organization",
        isOrganization: true,
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

      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: userAdmin.id } },
        team: { connect: { id: org.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teammate1.id } },
        team: { connect: { id: org.id } },
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teammate2.id } },
        team: { connect: { id: org.id } },
      });

      team = await teamsRepositoryFixture.create({
        name: "Test org team",
        isOrganization: false,
        parent: { connect: { id: org.id } },
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

    it("should create a team event-type", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: "Coding consultation",
        slug: "coding-consultation",
        description: "Our team will review your codebase.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "cal-video",
          },
        ],
        bookingFields: [
          {
            type: "select",
            label: "select which language is your codebase in",
            slug: "select-language",
            required: true,
            placeholder: "select language",
            options: ["javascript", "python", "cobol"],
          },
        ],
        schedulingType: "COLLECTIVE",
        hosts: [
          {
            userId: teammate1.id,
            mandatory: true,
            priority: "high",
          },
          {
            userId: teammate2.id,
            mandatory: false,
            priority: "low",
          },
        ],
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams/${team.id}/event-types`)
        .send(body)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          teamEventType = responseBody.data;
          console.log("teamEventType", JSON.stringify(teamEventType, null, 2));
        });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(userAdmin.email);
      await userRepositoryFixture.deleteByEmail(teammate1.email);
      await userRepositoryFixture.deleteByEmail(teammate2.email);
      await teamsRepositoryFixture.delete(team.id);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});
