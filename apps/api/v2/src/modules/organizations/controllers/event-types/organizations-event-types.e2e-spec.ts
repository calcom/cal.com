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
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  ApiSuccessResponse,
  CreateTeamEventTypeInput_2024_06_14,
  Host,
  TeamEventTypeOutput_2024_06_14,
  UpdateTeamEventTypeInput_2024_06_14,
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
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;

    let org: Team;
    let team: Team;

    const userEmail = "org-admin-event-types-controller-e222e@api.com";
    let userAdmin: User;

    const teammate1Email = "teammate111@team.com";
    const teammate2Email = "teammate221@team.com";
    let teammate1: User;
    let teammate2: User;

    let collectiveEventType: TeamEventTypeOutput_2024_06_14;
    let managedEventType: TeamEventTypeOutput_2024_06_14;
    let managedTeammate1EventType: TeamEventTypeOutput_2024_06_14;
    let managedTeammate2EventType: TeamEventTypeOutput_2024_06_14;

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
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

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

      team = await teamsRepositoryFixture.create({
        name: "Test org team",
        isOrganization: false,
        parent: { connect: { id: org.id } },
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
      expect(organizationsRepositoryFixture).toBeDefined();
      expect(userAdmin).toBeDefined();
      expect(org).toBeDefined();
    });

    it("should create a collective team event-type", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: "Coding consultation collective",
        slug: "coding-consultation collective",
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
        .expect(201)
        .then((response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.title).toEqual(body.title);
          expect(data.hosts.length).toEqual(2);
          evaluateHost(body.hosts[0], data.hosts[0]);
          evaluateHost(body.hosts[1], data.hosts[1]);

          collectiveEventType = responseBody.data;
        });
    });

    it("should create a managed team event-type", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: "Coding consultation managed",
        slug: "coding-consultation-managed",
        description: "Our team will review your codebase.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "cal-video",
          },
        ],
        schedulingType: "MANAGED",
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
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.length).toEqual(3);

          const teammate1EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teammate1.id);
          const teammate2EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teammate2.id);
          const teamEventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(team.id);

          expect(teammate1EventTypes.length).toEqual(1);
          expect(teammate2EventTypes.length).toEqual(1);
          expect(teamEventTypes.filter((eventType) => eventType.schedulingType === "MANAGED").length).toEqual(
            1
          );

          const responseTeamEvent = responseBody.data[0];
          expect(responseTeamEvent?.teamId).toEqual(team.id);

          const responseTeammate1Event = responseBody.data[1];
          expect(responseTeammate1Event?.ownerId).toEqual(teammate1.id);
          expect(responseTeammate1Event?.parentEventTypeId).toEqual(responseTeamEvent?.id);

          const responseTeammate2Event = responseBody.data[2];
          expect(responseTeammate2Event?.ownerId).toEqual(teammate2.id);
          expect(responseTeammate2Event?.parentEventTypeId).toEqual(responseTeamEvent?.id);

          managedEventType = responseTeamEvent;
          managedTeammate1EventType = responseTeammate1Event;
          managedTeammate2EventType = responseTeammate2Event;
        });
    });

    it("should get a team event-type", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${collectiveEventType.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.title).toEqual(collectiveEventType.title);
          expect(data.hosts.length).toEqual(2);
          evaluateHost(collectiveEventType.hosts[0], data.hosts[0]);
          evaluateHost(collectiveEventType.hosts[1], data.hosts[1]);

          collectiveEventType = responseBody.data;
        });
    });

    it("should get team event-types", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${team.id}/event-types`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.length).toEqual(2);

          const eventType = data[0];
          expect(eventType.title).toEqual(collectiveEventType.title);
          expect(eventType.hosts.length).toEqual(2);
          evaluateHost(collectiveEventType.hosts[0], eventType.hosts[0]);
          evaluateHost(collectiveEventType.hosts[1], eventType.hosts[1]);
        });
    });

    it("should update collective event-type", async () => {
      const newHosts: UpdateTeamEventTypeInput_2024_06_14["hosts"] = [
        {
          userId: teammate1.id,
          mandatory: true,
          priority: "medium",
        },
      ];

      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        hosts: newHosts,
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${collectiveEventType.id}`)
        .send(body)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const eventType = responseBody.data;
          expect(eventType.title).toEqual(collectiveEventType.title);
          expect(eventType.hosts.length).toEqual(1);
          evaluateHost(eventType.hosts[0], newHosts[0]);
        });
    });

    it("should update managed event-type", async () => {
      const newTitle = "Coding consultation managed updated";
      const newHosts: UpdateTeamEventTypeInput_2024_06_14["hosts"] = [
        {
          userId: teammate1.id,
          mandatory: true,
          priority: "medium",
        },
      ];

      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        title: newTitle,
        hosts: newHosts,
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${managedEventType.id}`)
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.length).toEqual(2);

          const teammate1EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teammate1.id);
          const teammate2EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teammate2.id);
          const teamEventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(team.id);

          expect(teammate1EventTypes.length).toEqual(1);
          expect(teammate2EventTypes.length).toEqual(0);
          expect(teamEventTypes.filter((eventType) => eventType.schedulingType === "MANAGED").length).toEqual(
            1
          );

          expect(data[0].title).toEqual(newTitle);
          expect(data[1].title).toEqual(newTitle);

          expect(teammate1EventTypes[0].title).toEqual(newTitle);
          expect(
            teamEventTypes.filter((eventType) => eventType.schedulingType === "MANAGED")?.[0]?.title
          ).toEqual(newTitle);

          managedEventType = responseBody.data[0];
        });
    });

    it("should assign all members to managed event-type", async () => {
      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        assignAllTeamMembers: true,
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${managedEventType.id}`)
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.length).toEqual(3);

          const teammate1EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teammate1.id);
          const teammate2EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teammate2.id);
          const teamEventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(team.id);

          expect(teammate1EventTypes.length).toEqual(1);
          expect(teammate2EventTypes.length).toEqual(1);
          expect(teamEventTypes.filter((eventType) => eventType.schedulingType === "MANAGED").length).toEqual(
            1
          );

          const responseTeamEvent = responseBody.data[0];
          expect(responseTeamEvent?.teamId).toEqual(team.id);

          const responseTeammate1Event = responseBody.data[1];
          expect(responseTeammate1Event?.ownerId).toEqual(teammate1.id);
          expect(responseTeammate1Event?.parentEventTypeId).toEqual(responseTeamEvent?.id);

          const responseTeammate2Event = responseBody.data[2];
          expect(responseTeammate2Event?.ownerId).toEqual(teammate2.id);
          expect(responseTeammate2Event?.parentEventTypeId).toEqual(responseTeamEvent?.id);

          managedEventType = responseTeamEvent;
          managedTeammate1EventType = responseTeammate1Event;
          managedTeammate2EventType = responseTeammate2Event;
        });
    });

    it("should delete collective event-type", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${collectiveEventType.id}`)
        .expect(200);
    });

    it("should delete managed event-type", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${managedEventType.id}`)
        .expect(200);
    });

    function evaluateHost(expected: Host, received: Host) {
      expect(expected.userId).toEqual(received.userId);
      expect(expected.mandatory).toEqual(received.mandatory);
      expect(expected.priority).toEqual(received.priority);
    }

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
