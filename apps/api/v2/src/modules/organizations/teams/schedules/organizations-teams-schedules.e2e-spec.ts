import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type {
  ApiSuccessResponse,
  GetSchedulesOutput_2024_06_11,
  ScheduleOutput_2024_06_11,
} from "@calcom/platform-types";
import type { EventType, Schedule, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { HostsRepositoryFixture } from "test/fixtures/repository/hosts.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { SchedulesRepositoryFixture } from "test/fixtures/repository/schedules.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Organizations Teams Schedules Endpoints", () => {
  describe("User Authentication - User is Org Admin", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;
    let scheduleRepositoryFixture: SchedulesRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let hostsRepositoryFixture: HostsRepositoryFixture;
    let prismaWriteService: PrismaWriteService;

    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let orgTeam: Team;
    let nonOrgTeam: Team;

    let userSchedule: Schedule;
    let user2Schedule: Schedule;
    let userEventTypeSchedule: Schedule;
    let teamEventTypeSchedule: Schedule;

    let userEventType: EventType;
    let teamEventType: EventType;

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
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      hostsRepositoryFixture = new HostsRepositoryFixture(moduleRef);
      prismaWriteService = moduleRef.get(PrismaWriteService);
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

      userEventTypeSchedule = await scheduleRepositoryFixture.create({
        user: {
          connect: {
            id: user2.id,
          },
        },
        name: `organizations-teams-schedules-user-event-type-schedule-${randomString()}`,
        timeZone: "America/New_York",
      });

      teamEventTypeSchedule = await scheduleRepositoryFixture.create({
        user: {
          connect: {
            id: user2.id,
          },
        },
        name: `organizations-teams-schedules-team-event-type-schedule-${randomString()}`,
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

      userEventType = await eventTypesRepositoryFixture.create(
        {
          title: `User Event Type ${randomString()}`,
          slug: `user-event-type-${randomString()}`,
          length: 30,
          schedule: {
            connect: {
              id: userEventTypeSchedule.id,
            },
          },
        },
        user2.id
      );

      teamEventType = await eventTypesRepositoryFixture.createTeamEventType({
        title: `Team Event Type ${randomString()}`,
        slug: `team-event-type-${randomString()}`,
        length: 30,
        team: {
          connect: {
            id: orgTeam.id,
          },
        },
      });

      await hostsRepositoryFixture.create({
        user: {
          connect: {
            id: user2.id,
          },
        },
        eventType: {
          connect: {
            id: teamEventType.id,
          },
        },
        schedule: {
          connect: {
            id: teamEventTypeSchedule.id,
          },
        },
        isFixed: false,
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

          expect(responseBody.data.length).toBeGreaterThanOrEqual(2);

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

    describe("eventTypeId query parameter", () => {
      describe("GET /users/:userId/schedules", () => {
        it("should filter user schedules by user-owned event type", async () => {
          return request(app.getHttpServer())
            .get(
              `/v2/organizations/${org.id}/teams/${orgTeam.id}/users/${user2.id}/schedules?eventTypeId=${userEventType.id}`
            )
            .expect(200)
            .then((response) => {
              const responseBody: ApiSuccessResponse<ScheduleOutput_2024_06_11[]> = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              expect(Array.isArray(responseBody.data)).toBe(true);
              expect(responseBody.data.length).toEqual(1);
              expect(responseBody.data[0].id).toEqual(userEventTypeSchedule.id);
              expect(responseBody.data[0].name).toEqual(userEventTypeSchedule.name);
            });
        });

        it("should filter user schedules by team event type where user is a host", async () => {
          return request(app.getHttpServer())
            .get(
              `/v2/organizations/${org.id}/teams/${orgTeam.id}/users/${user2.id}/schedules?eventTypeId=${teamEventType.id}`
            )
            .expect(200)
            .then((response) => {
              const responseBody: ApiSuccessResponse<ScheduleOutput_2024_06_11[]> = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              expect(Array.isArray(responseBody.data)).toBe(true);
              expect(responseBody.data.length).toEqual(1);
              expect(responseBody.data[0].id).toEqual(teamEventTypeSchedule.id);
              expect(responseBody.data[0].name).toEqual(teamEventTypeSchedule.name);
            });
        });

        it("should return 404 when event type does not exist", async () => {
          return request(app.getHttpServer())
            .get(
              `/v2/organizations/${org.id}/teams/${orgTeam.id}/users/${user2.id}/schedules?eventTypeId=999999`
            )
            .expect(404);
        });

        it("should return 404 when user is not associated with event type", async () => {
          const otherUserEventType = await eventTypesRepositoryFixture.create(
            {
              title: `Other User Event Type ${randomString()}`,
              slug: `other-user-event-type-${randomString()}`,
              length: 30,
            },
            user.id
          );

          try {
            await request(app.getHttpServer())
              .get(
                `/v2/organizations/${org.id}/teams/${orgTeam.id}/users/${user2.id}/schedules?eventTypeId=${otherUserEventType.id}`
              )
              .expect(404);
          } finally {
            await eventTypesRepositoryFixture.delete(otherUserEventType.id);
          }
        });

        it("should return empty array when event type has no schedule and user has no default schedule", async () => {
          const eventTypeWithoutSchedule = await eventTypesRepositoryFixture.create(
            {
              title: `Event Type Without Schedule ${randomString()}`,
              slug: `event-type-no-schedule-${randomString()}`,
              length: 30,
            },
            user2.id
          );

          const user2Original = await prismaWriteService.prisma.user.findUnique({
            where: { id: user2.id },
            select: { defaultScheduleId: true },
          });
          const originalDefaultScheduleId = user2Original?.defaultScheduleId ?? null;

          await prismaWriteService.prisma.user.update({
            where: { id: user2.id },
            data: { defaultScheduleId: null },
          });

          try {
            const response = await request(app.getHttpServer())
              .get(
                `/v2/organizations/${org.id}/teams/${orgTeam.id}/users/${user2.id}/schedules?eventTypeId=${eventTypeWithoutSchedule.id}`
              )
              .expect(200);

            const responseBody: ApiSuccessResponse<ScheduleOutput_2024_06_11[]> = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(Array.isArray(responseBody.data)).toBe(true);
            expect(responseBody.data.length).toEqual(0);
          } finally {
            await prismaWriteService.prisma.user.update({
              where: { id: user2.id },
              data: { defaultScheduleId: originalDefaultScheduleId },
            });
            await eventTypesRepositoryFixture.delete(eventTypeWithoutSchedule.id);
          }
        });
      });

      describe("GET /schedules (team schedules)", () => {
        it("should filter team schedules by event type", async () => {
          return request(app.getHttpServer())
            .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/schedules?eventTypeId=${teamEventType.id}`)
            .expect(200)
            .then((response) => {
              const responseBody: GetSchedulesOutput_2024_06_11 = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              expect(Array.isArray(responseBody.data)).toBe(true);

              expect(responseBody.data.length).toBeGreaterThanOrEqual(1);
              const user2ScheduleFound = responseBody.data.find(
                (schedule) => schedule.id === teamEventTypeSchedule.id
              );
              expect(user2ScheduleFound).toBeDefined();
              expect(user2ScheduleFound?.id).toEqual(teamEventTypeSchedule.id);
            });
        });

        it("should return 404 when team event type does not exist", async () => {
          return request(app.getHttpServer())
            .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/schedules?eventTypeId=999999`)
            .expect(404);
        });

        it("should return empty array when event type has no hosts with schedules", async () => {
          const teamEventTypeNoHosts = await eventTypesRepositoryFixture.createTeamEventType({
            title: `Team Event Type No Hosts ${randomString()}`,
            slug: `team-event-type-no-hosts-${randomString()}`,
            length: 30,
            team: {
              connect: {
                id: orgTeam.id,
              },
            },
          });

          try {
            const response = await request(app.getHttpServer())
              .get(
                `/v2/organizations/${org.id}/teams/${orgTeam.id}/schedules?eventTypeId=${teamEventTypeNoHosts.id}`
              )
              .expect(200);

            const responseBody: GetSchedulesOutput_2024_06_11 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(Array.isArray(responseBody.data)).toBe(true);
            expect(responseBody.data.length).toEqual(0);
          } finally {
            await eventTypesRepositoryFixture.delete(teamEventTypeNoHosts.id);
          }
        });
      });
    });

    afterAll(async () => {
      if (userEventType) {
        await eventTypesRepositoryFixture.delete(userEventType.id);
      }
      if (teamEventType) {
        await eventTypesRepositoryFixture.delete(teamEventType.id);
      }
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
