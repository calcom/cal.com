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
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { SchedulesRepositoryFixture } from "test/fixtures/repository/schedules.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiSuccessResponse, ScheduleOutput_2024_06_11 } from "@calcom/platform-types";
import { Team, Schedule } from "@calcom/prisma/client";

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
    let user2Schedule: Schedule;

    const userEmail = "org-admin-schedules-teams-controller-e2e@api.com";
    const userEmail2 = "org-member-schedules-teams-controller-e2e@api.com";
    const nonOrgUserEmail = "non-org-member-schedules-teams-controller-e2e@api.com";

    const invitedUserEmail = "org-member-invited-schedules-teams-controller-e2e@api.com";

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

      user2Schedule = await scheduleRepositoryFixture.create({
        user: {
          connect: {
            id: user2.id,
          },
        },
        name: "User 2 schedule",
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
        name: "Test Organization",
        isOrganization: true,
      });

      orgTeam = await teamsRepositoryFixture.create({
        name: "Org Team",
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      nonOrgTeam = await teamsRepositoryFixture.create({
        name: "Non Org Team",
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
