import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { SchedulesRepositoryFixture } from "test/fixtures/repository/schedules.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type {
  GetSchedulesOutput_2024_06_11,
  ApiSuccessResponse,
  ScheduleOutput_2024_06_11,
} from "@calcom/platform-types";
import type { User, Team, Schedule } from "@calcom/prisma/client";

describe("Organizations Teams Schedules Endpoints", () => {
  describe("User Authentication - User is Org Admin", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;
    let scheduleRepositoryFixture: SchedulesRepositoryFixture;

    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let orgTeam: Team;
    let nonOrgTeam: Team;

    let userSchedule: Schedule;
    let user2Schedule: Schedule;

    const userEmail = `organizations-teams-schedules-admin-${randomString()}@api.com`;
    const userEmail2 = `organizations-teams-schedules-member-${randomString()}@api.com`;
    const nonOrgUserEmail = `organizations-teams-schedules-non-org-${randomString()}@api.com`;
    const invitedUserEmail = `organizations-teams-schedules-invited-${randomString()}@api.com`;

    let user: User;
    let user2: User;
    let nonOrgUser: User;

    let userToInviteViaApi: User;

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
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
      scheduleRepositoryFixture = new SchedulesRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });
      user2 = await userRepositoryFixture.create({
        email: userEmail2,
        username: userEmail2,
      });

      userSchedule = await scheduleRepositoryFixture.create({
        user: {
          connect: {
            id: user.id,
          },
        },
        name: `organizations-teams-schedules-user-schedule-${randomString()}`,
        timeZone: "America/New_York",
      });

      user2Schedule = await scheduleRepositoryFixture.create({
        user: {
          connect: {
            id: user2.id,
          },
        },
        name: `organizations-teams-schedules-user2-schedule-${randomString()}`,
        timeZone: "America/New_York",
      });

      nonOrgUser = await userRepositoryFixture.create({
        email: nonOrgUserEmail,
        username: nonOrgUserEmail,
      });

      userToInviteViaApi = await userRepositoryFixture.create({
        email: invitedUserEmail,
        username: invitedUserEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: `organizations-teams-schedules-organization-${randomString()}`,
        isOrganization: true,
      });

      orgTeam = await teamsRepositoryFixture.create({
        name: `organizations-teams-schedules-team-${randomString()}`,
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      nonOrgTeam = await teamsRepositoryFixture.create({
        name: `organizations-teams-schedules-non-org-team-${randomString()}`,
        isOrganization: false,
      });

      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: user.id } },
        team: { connect: { id: orgTeam.id } },
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user2.id } },
        team: { connect: { id: orgTeam.id } },
      });

      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user2.id } },
        team: { connect: { id: org.id } },
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: userToInviteViaApi.id } },
        team: { connect: { id: org.id } },
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: nonOrgUser.id } },
        team: { connect: { id: nonOrgTeam.id } },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${user.id}`,
        username: userEmail,
        organization: {
          connect: {
            id: org.id,
          },
        },
        user: {
          connect: {
            id: user.id,
          },
        },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${user2.id}`,
        username: userEmail2,
        organization: {
          connect: {
            id: org.id,
          },
        },
        user: {
          connect: {
            id: user2.id,
          },
        },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${userToInviteViaApi.id}`,
        username: invitedUserEmail,
        organization: {
          connect: {
            id: org.id,
          },
        },
        user: {
          connect: {
            id: userToInviteViaApi.id,
          },
        },
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

    it("should get all the schedule of the org's team's member", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/users/${user2.id}/schedules`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<ScheduleOutput_2024_06_11[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.find((d) => d.id === user2Schedule.id)?.name).toEqual(user2Schedule.name);
        });
    });

    it("should get all the schedules of members in a team", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/schedules`)
        .expect(200)
        .then((response) => {
          const responseBody: GetSchedulesOutput_2024_06_11 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(Array.isArray(responseBody.data)).toBe(true);
          expect(responseBody.data.length).toEqual(2);

          const userOneSchedule = responseBody.data.find((schedule) => schedule.id === userSchedule.id);
          const userTwoSchedule = responseBody.data.find((schedule) => schedule.id === user2Schedule.id);

          expect(userOneSchedule).toBeDefined();
          expect(userTwoSchedule).toBeDefined();

          expect(userOneSchedule?.id).toEqual(userSchedule.id);
          expect(userOneSchedule?.name).toEqual(userSchedule.name);
          expect(userOneSchedule?.timeZone).toEqual(userSchedule.timeZone);

          expect(userTwoSchedule?.id).toEqual(user2Schedule.id);
          expect(userTwoSchedule?.name).toEqual(user2Schedule.name);
          expect(userOneSchedule?.timeZone).toEqual(user2Schedule.timeZone);
        });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await userRepositoryFixture.deleteByEmail(userToInviteViaApi.email);
      await userRepositoryFixture.deleteByEmail(nonOrgUser.email);
      await userRepositoryFixture.deleteByEmail(user2.email);
      await organizationsRepositoryFixture.delete(org.id);
      await teamsRepositoryFixture.delete(nonOrgTeam.id);
      await app.close();
    });
  });
});
