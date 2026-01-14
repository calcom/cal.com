import { SUCCESS_STATUS, X_CAL_CLIENT_ID, X_CAL_SECRET_KEY } from "@calcom/platform-constants";
import type {
  ApiSuccessResponse,
  CreateTeamEventTypeInput_2024_06_14,
  Host,
  OrgTeamOutputDto,
  TeamEventTypeOutput_2024_06_14,
  UpdateTeamEventTypeInput_2024_06_14,
} from "@calcom/platform-types";
import type { PlatformOAuthClient, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { HostsRepositoryFixture } from "test/fixtures/repository/hosts.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { Locales } from "@/lib/enums/locales";
import {
  CreateManagedUserData,
  CreateManagedUserOutput,
} from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/create-managed-user.output";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { CreateOrgTeamDto } from "@/modules/organizations/teams/index/inputs/create-organization-team.input";
import { CreateOrgTeamMembershipDto } from "@/modules/organizations/teams/memberships/inputs/create-organization-team-membership.input";
import { OrgTeamMembershipOutputResponseDto } from "@/modules/organizations/teams/memberships/outputs/organization-teams-memberships.output";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UsersModule } from "@/modules/users/users.module";

const CLIENT_REDIRECT_URI = "http://localhost:4321";

describe("Assign all team members", () => {
  let app: INestApplication;

  let oAuthClient: PlatformOAuthClient;
  let organization: Team;
  let userRepositoryFixture: UserRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let profilesRepositoryFixture: ProfileRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;
  let hostsRepositoryFixture: HostsRepositoryFixture;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;

  const platformAdminEmail = `assign-all-team-members-admin-${randomString()}@api.com`;
  let platformAdmin: User;

  let managedTeam: OrgTeamOutputDto;

  const managedUsersTimeZone = "Europe/Rome";
  const firstManagedUserEmail = `managed-user-bookings-2024-04-15-first-user@api.com`;
  const secondManagedUserEmail = `managed-user-bookings-2024-04-15-second-user@api.com`;
  let firstManagedUser: CreateManagedUserData;
  let secondManagedUser: CreateManagedUserData;

  let roundRobinEventType: TeamEventTypeOutput_2024_06_14;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaExceptionFilter, HttpExceptionFilter],
      imports: [AppModule, UsersModule],
    }).compile();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    hostsRepositoryFixture = new HostsRepositoryFixture(moduleRef);
    eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

    platformAdmin = await userRepositoryFixture.create({ email: platformAdminEmail });

    organization = await teamRepositoryFixture.create({
      name: `oauth-client-users-organization-${randomString()}`,
      isPlatform: true,
      isOrganization: true,
      platformBilling: {
        create: {
          customerId: "cus_999",
          plan: "ESSENTIALS",
          subscriptionId: "sub_999",
        },
      },
    });
    oAuthClient = await createOAuthClient(organization.id);

    await profilesRepositoryFixture.create({
      uid: randomString(),
      username: platformAdminEmail,
      organization: { connect: { id: organization.id } },
      user: {
        connect: { id: platformAdmin.id },
      },
    });

    await membershipsRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: platformAdmin.id } },
      team: { connect: { id: organization.id } },
      accepted: true,
    });

    await app.init();
  });

  async function createOAuthClient(organizationId: number) {
    const data = {
      logo: "logo-url",
      name: "name",
      redirectUris: [CLIENT_REDIRECT_URI],
      permissions: 1023,
      areDefaultEventTypesEnabled: false,
    };
    const secret = "secret";

    const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
    return client;
  }

  describe("setup managed users", () => {
    it("should create first managed user", async () => {
      const requestBody: CreateManagedUserInput = {
        email: firstManagedUserEmail,
        timeZone: managedUsersTimeZone,
        weekStart: "Monday",
        timeFormat: 24,
        locale: Locales.FR,
        name: "Alice Smith",
        avatarUrl: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
        .set(X_CAL_SECRET_KEY, oAuthClient.secret)
        .send(requestBody)
        .expect(201);

      const responseBody: CreateManagedUserOutput = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.user.email).toEqual(
        OAuthClientUsersService.getOAuthUserEmail(oAuthClient.id, requestBody.email)
      );
      expect(responseBody.data.accessToken).toBeDefined();
      expect(responseBody.data.refreshToken).toBeDefined();

      firstManagedUser = responseBody.data;
    });

    it("should create second managed user", async () => {
      const requestBody: CreateManagedUserInput = {
        email: secondManagedUserEmail,
        timeZone: managedUsersTimeZone,
        weekStart: "Monday",
        timeFormat: 24,
        locale: Locales.FR,
        name: "Bob Smith",
        avatarUrl: "https://cal.com/api/avatar/2b735186-b01b-46d3-87da-019b8f61776b.png",
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
        .set(X_CAL_SECRET_KEY, oAuthClient.secret)
        .send(requestBody)
        .expect(201);

      const responseBody: CreateManagedUserOutput = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data.user.email).toEqual(
        OAuthClientUsersService.getOAuthUserEmail(oAuthClient.id, requestBody.email)
      );
      expect(responseBody.data.accessToken).toBeDefined();
      expect(responseBody.data.refreshToken).toBeDefined();

      secondManagedUser = responseBody.data;
    });
  });

  describe("should setup managed team", () => {
    it("should create managed team", async () => {
      const body: CreateOrgTeamDto = {
        name: `team-${randomString()}`,
      };
      return request(app.getHttpServer())
        .post(`/v2/organizations/${organization.id}/teams`)
        .send(body)
        .set(X_CAL_SECRET_KEY, oAuthClient.secret)
        .set(X_CAL_CLIENT_ID, oAuthClient.id)
        .expect(201)
        .then((response) => {
          const responseBody: ApiSuccessResponse<OrgTeamOutputDto> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          managedTeam = responseBody.data;
        });
    });
  });

  describe("should setup memberships", () => {
    it("should create first user's membership of the org's team", async () => {
      const body: CreateOrgTeamMembershipDto = {
        userId: firstManagedUser.user.id,
        accepted: true,
        role: "MEMBER",
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${organization.id}/teams/${managedTeam.id}/memberships`)
        .send(body)
        .set(X_CAL_SECRET_KEY, oAuthClient.secret)
        .set(X_CAL_CLIENT_ID, oAuthClient.id)
        .expect(201)
        .then((response) => {
          const responseBody: OrgTeamMembershipOutputResponseDto = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
        });
    });

    it("should create second user's membership of the org's team", async () => {
      const body: CreateOrgTeamMembershipDto = {
        userId: secondManagedUser.user.id,
        accepted: true,
        role: "MEMBER",
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${organization.id}/teams/${managedTeam.id}/memberships`)
        .send(body)
        .set(X_CAL_SECRET_KEY, oAuthClient.secret)
        .set(X_CAL_CLIENT_ID, oAuthClient.id)
        .expect(201)
        .then((response) => {
          const responseBody: OrgTeamMembershipOutputResponseDto = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
        });
    });
  });

  describe("should setup event types using assignAllTeamMembers true", () => {
    it("should be able to setup team event type if no hosts nor assignAllTeamMembers provided", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: "Coding consultation round robin",
        slug: `organizations-event-types-round-robin-${randomString()}`,
        lengthInMinutes: 60,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        schedulingType: "collective",
      };

      const response = await request(app.getHttpServer())
        .post(`/v2/organizations/${organization.id}/teams/${managedTeam.id}/event-types`)
        .send(body)
        .set(X_CAL_SECRET_KEY, oAuthClient.secret)
        .set(X_CAL_CLIENT_ID, oAuthClient.id)
        .expect(201);

      const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);

      const data = responseBody.data;
      expect(data.title).toEqual(body.title);
      expect(data.hosts).toEqual([]);
      expect(data.schedulingType).toEqual("collective");
      const eventTypeHosts = await hostsRepositoryFixture.getEventTypeHosts(data.id);
      expect(eventTypeHosts.length).toEqual(0);
    });

    it("should setup collective event type assignAllTeamMembers true", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: "Coding consultation collective",
        slug: `assign-all-team-members-collective-${randomString()}`,
        lengthInMinutes: 60,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        schedulingType: "collective",
        assignAllTeamMembers: true,
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${organization.id}/teams/${managedTeam.id}/event-types`)
        .send(body)
        .set(X_CAL_SECRET_KEY, oAuthClient.secret)
        .set(X_CAL_CLIENT_ID, oAuthClient.id)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.title).toEqual(body.title);
          expect(data.hosts.length).toEqual(2);
          expect(data.schedulingType).toEqual("collective");
          const dataFirstHost = data.hosts.find((host) => host.userId === firstManagedUser.user.id);
          const dataSecondHost = data.hosts.find((host) => host.userId === secondManagedUser.user.id);
          evaluateHost({ userId: firstManagedUser.user.id }, dataFirstHost);
          evaluateHost({ userId: secondManagedUser.user.id }, dataSecondHost);

          const eventTypeHosts = await hostsRepositoryFixture.getEventTypeHosts(data.id);
          expect(eventTypeHosts.length).toEqual(2);
          const firstHost = eventTypeHosts.find((host) => host.userId === firstManagedUser.user.id);
          const secondHost = eventTypeHosts.find((host) => host.userId === secondManagedUser.user.id);
          expect(firstHost).toBeDefined();
          expect(secondHost).toBeDefined();
        });
    });

    it("should setup round robin event type assignAllTeamMembers true", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: "Coding consultation round robin",
        slug: `assign-all-team-members-round-robin-${randomString()}`,
        lengthInMinutes: 60,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        schedulingType: "roundRobin",
        assignAllTeamMembers: true,
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${organization.id}/teams/${managedTeam.id}/event-types`)
        .send(body)
        .set(X_CAL_SECRET_KEY, oAuthClient.secret)
        .set(X_CAL_CLIENT_ID, oAuthClient.id)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.title).toEqual(body.title);
          expect(data.hosts.length).toEqual(2);
          expect(data.schedulingType).toEqual("roundRobin");
          const dataFirstHost = data.hosts.find((host) => host.userId === firstManagedUser.user.id);
          const dataSecondHost = data.hosts.find((host) => host.userId === secondManagedUser.user.id);
          evaluateHost(
            { userId: firstManagedUser.user.id, mandatory: false, priority: "medium" },
            dataFirstHost
          );
          evaluateHost(
            { userId: secondManagedUser.user.id, mandatory: false, priority: "medium" },
            dataSecondHost
          );

          const eventTypeHosts = await hostsRepositoryFixture.getEventTypeHosts(data.id);
          expect(eventTypeHosts.length).toEqual(2);
          const firstHost = eventTypeHosts.find((host) => host.userId === firstManagedUser.user.id);
          const secondHost = eventTypeHosts.find((host) => host.userId === secondManagedUser.user.id);
          expect(firstHost).toBeDefined();
          expect(secondHost).toBeDefined();
          roundRobinEventType = data;
        });
    });

    it("should update round robin event type", async () => {
      if (!roundRobinEventType) {
        const setupBody: CreateTeamEventTypeInput_2024_06_14 = {
          title: "Coding consultation round robin",
          slug: `assign-all-team-members-round-robin-${randomString()}`,
          lengthInMinutes: 60,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          schedulingType: "roundRobin",
          assignAllTeamMembers: true,
        };

        const setupResponse = await request(app.getHttpServer())
          .post(`/v2/organizations/${organization.id}/teams/${managedTeam.id}/event-types`)
          .send(setupBody)
          .set(X_CAL_SECRET_KEY, oAuthClient.secret)
          .set(X_CAL_CLIENT_ID, oAuthClient.id)
          .expect(201);

        const setupResponseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = setupResponse.body;
        roundRobinEventType = setupResponseBody.data;
      }

      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        title: "Coding consultation round robin updated",
      };

      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/${organization.id}/teams/${managedTeam.id}/event-types/${roundRobinEventType.id}`
        )
        .send(body)
        .set(X_CAL_SECRET_KEY, oAuthClient.secret)
        .set(X_CAL_CLIENT_ID, oAuthClient.id)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.title).toEqual(body.title);
          expect(data.hosts.length).toEqual(2);
          expect(data.schedulingType).toEqual("roundRobin");
          const dataFirstHost = data.hosts.find((host) => host.userId === firstManagedUser.user.id);
          const dataSecondHost = data.hosts.find((host) => host.userId === secondManagedUser.user.id);
          evaluateHost(
            { userId: firstManagedUser.user.id, mandatory: false, priority: "medium" },
            dataFirstHost
          );
          evaluateHost(
            { userId: secondManagedUser.user.id, mandatory: false, priority: "medium" },
            dataSecondHost
          );

          const eventTypeHosts = await hostsRepositoryFixture.getEventTypeHosts(data.id);
          expect(eventTypeHosts.length).toEqual(2);
          const firstHost = eventTypeHosts.find((host) => host.userId === firstManagedUser.user.id);
          const secondHost = eventTypeHosts.find((host) => host.userId === secondManagedUser.user.id);
          expect(firstHost).toBeDefined();
          expect(secondHost).toBeDefined();
        });
    });

    it("should setup managed event type assignAllTeamMembers true", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: "Coding consultation managed",
        slug: `assign-all-team-members-managed-${randomString()}`,
        lengthInMinutes: 60,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        schedulingType: "managed",
        assignAllTeamMembers: true,
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${organization.id}/teams/${managedTeam.id}/event-types`)
        .send(body)
        .set(X_CAL_SECRET_KEY, oAuthClient.secret)
        .set(X_CAL_CLIENT_ID, oAuthClient.id)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.length).toEqual(3);

          const teammate1EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(
            firstManagedUser.user.id
          );
          const teammate2EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(
            secondManagedUser.user.id
          );
          const teamEventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(managedTeam.id);
          const managedTeamEventTypes = teamEventTypes.filter(
            (eventType) => eventType.schedulingType === "MANAGED"
          );

          expect(teammate1EventTypes.length).toEqual(1);
          expect(teammate2EventTypes.length).toEqual(1);
          expect(managedTeamEventTypes.length).toEqual(1);
          expect(managedTeamEventTypes[0].assignAllTeamMembers).toEqual(true);

          const responseTeamEvent = responseBody.data.find(
            (eventType) => eventType.schedulingType === "managed"
          );
          expect(responseTeamEvent).toBeDefined();
          expect(responseTeamEvent?.teamId).toEqual(managedTeam.id);
          expect(responseTeamEvent?.assignAllTeamMembers).toEqual(true);

          const responseTeammate1Event = responseBody.data.find(
            (eventType) => eventType.ownerId === firstManagedUser.user.id
          );
          expect(responseTeammate1Event).toBeDefined();
          expect(responseTeammate1Event?.parentEventTypeId).toEqual(responseTeamEvent?.id);

          const responseTeammate2Event = responseBody.data.find(
            (eventType) => eventType.ownerId === secondManagedUser.user.id
          );
          expect(responseTeammate2Event).toBeDefined();
          expect(responseTeammate2Event?.parentEventTypeId).toEqual(responseTeamEvent?.id);
        });
    });
  });

  function evaluateHost(expected: Partial<Host>, received: Host | undefined) {
    if (!received) {
      throw new Error(`Host is undefined. Expected userId: ${expected.userId}`);
    }
    expect(expected.userId).toEqual(received.userId);
    if (expected.mandatory !== undefined) {
      expect(expected.mandatory).toEqual(received.mandatory);
    }
    if (expected.priority !== undefined) {
      expect(expected.priority).toEqual(received.priority);
    }
  }

  afterAll(async () => {
    await userRepositoryFixture.delete(firstManagedUser.user.id);
    await userRepositoryFixture.delete(secondManagedUser.user.id);
    await userRepositoryFixture.delete(platformAdmin.id);
    await oauthClientRepositoryFixture.delete(oAuthClient.id);
    await teamRepositoryFixture.delete(organization.id);
    await app.close();
  });
});
