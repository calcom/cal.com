import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { Locales } from "@/lib/enums/locales";
import type { CreateManagedUserData } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/create-managed-user.output";
import { CreateOrgTeamDto } from "@/modules/organizations/teams/index/inputs/create-organization-team.input";
import { CreateOrgTeamMembershipDto } from "@/modules/organizations/teams/memberships/inputs/create-organization-team-membership.input";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import { SUCCESS_STATUS, X_CAL_CLIENT_ID, X_CAL_SECRET_KEY } from "@calcom/platform-constants";
import { SchedulingType } from "@calcom/platform-libraries";
import type {
  ApiSuccessResponse,
  CreateTeamEventTypeInput_2024_06_14,
  OrgTeamOutputDto,
  TeamEventTypeOutput_2024_06_14,
  UpdateTeamEventTypeInput_2024_06_14,
} from "@calcom/platform-types";
import type { PlatformOAuthClient, Team, User } from "@calcom/prisma/client";

describe("maxRoundRobinHosts for Round Robin event types", () => {
  let app: INestApplication;
  let oAuthClient: PlatformOAuthClient;
  let organization: Team;
  let managedTeam: OrgTeamOutputDto;
  let platformAdmin: User;
  const managedUsers: CreateManagedUserData[] = [];

  // Fixtures
  let userRepositoryFixture: UserRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let profilesRepositoryFixture: ProfileRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;

  // Helpers
  const createManagedUser = async (name: string): Promise<CreateManagedUserData> => {
    const body: CreateManagedUserInput = {
      email: `max-rr-${name.toLowerCase()}-${randomString()}@api.com`,
      timeZone: "Europe/Rome",
      weekStart: "Monday",
      timeFormat: 24,
      locale: Locales.FR,
      name,
    };

    const response = await request(app.getHttpServer())
      .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
      .set(X_CAL_SECRET_KEY, oAuthClient.secret)
      .send(body)
      .expect(201);

    return response.body.data;
  };

  const addUserToTeam = async (userId: number) => {
    const body: CreateOrgTeamMembershipDto = { userId, accepted: true, role: "MEMBER" };
    await request(app.getHttpServer())
      .post(`/v2/organizations/${organization.id}/teams/${managedTeam.id}/memberships`)
      .send(body)
      .set(X_CAL_SECRET_KEY, oAuthClient.secret)
      .set(X_CAL_CLIENT_ID, oAuthClient.id)
      .expect(201);
  };

  const createRoundRobinEventType = async (
    overrides: Partial<CreateTeamEventTypeInput_2024_06_14> = {}
  ): Promise<TeamEventTypeOutput_2024_06_14> => {
    const body: CreateTeamEventTypeInput_2024_06_14 = {
      title: "Round Robin Event",
      slug: `max-rr-hosts-${randomString()}`,
      lengthInMinutes: 30,
      schedulingType: SchedulingType.ROUND_ROBIN,
      assignAllTeamMembers: true,
      ...overrides,
    };

    const response = await request(app.getHttpServer())
      .post(`/v2/organizations/${organization.id}/teams/${managedTeam.id}/event-types`)
      .send(body)
      .set(X_CAL_SECRET_KEY, oAuthClient.secret)
      .set(X_CAL_CLIENT_ID, oAuthClient.id)
      .expect(201);

    const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
    expect(responseBody.status).toEqual(SUCCESS_STATUS);
    return responseBody.data;
  };

  const updateEventType = async (
    eventTypeId: number,
    body: UpdateTeamEventTypeInput_2024_06_14
  ): Promise<TeamEventTypeOutput_2024_06_14> => {
    const response = await request(app.getHttpServer())
      .patch(`/v2/organizations/${organization.id}/teams/${managedTeam.id}/event-types/${eventTypeId}`)
      .send(body)
      .set(X_CAL_SECRET_KEY, oAuthClient.secret)
      .set(X_CAL_CLIENT_ID, oAuthClient.id)
      .expect(200);

    const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
    expect(responseBody.status).toEqual(SUCCESS_STATUS);
    return responseBody.data;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaExceptionFilter, HttpExceptionFilter],
      imports: [AppModule, UsersModule],
    }).compile();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    // Initialize fixtures
    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

    // Create organization with platform billing
    organization = await teamRepositoryFixture.create({
      name: `max-rr-hosts-org-${randomString()}`,
      isPlatform: true,
      isOrganization: true,
      platformBilling: {
        create: {
          customerId: `cus_${randomString()}`,
          plan: "ESSENTIALS",
          subscriptionId: `sub_${randomString()}`,
        },
      },
    });

    // Create OAuth client
    oAuthClient = await oauthClientRepositoryFixture.create(
      organization.id,
      {
        logo: "logo-url",
        name: "test-client",
        redirectUris: ["http://localhost:4321"],
        permissions: 1023,
        areDefaultEventTypesEnabled: false,
      },
      "secret"
    );

    // Create platform admin
    const adminEmail = `max-rr-hosts-admin-${randomString()}@api.com`;
    platformAdmin = await userRepositoryFixture.create({ email: adminEmail });

    await profilesRepositoryFixture.create({
      uid: randomString(),
      username: adminEmail,
      organization: { connect: { id: organization.id } },
      user: { connect: { id: platformAdmin.id } },
    });

    await membershipsRepositoryFixture.create({
      role: "OWNER",
      user: { connect: { id: platformAdmin.id } },
      team: { connect: { id: organization.id } },
      accepted: true,
    });

    await app.init();

    // Create team
    const teamBody: CreateOrgTeamDto = { name: `team-${randomString()}` };
    const teamResponse = await request(app.getHttpServer())
      .post(`/v2/organizations/${organization.id}/teams`)
      .send(teamBody)
      .set(X_CAL_SECRET_KEY, oAuthClient.secret)
      .set(X_CAL_CLIENT_ID, oAuthClient.id)
      .expect(201);
    managedTeam = teamResponse.body.data;

    // Create and add 3 users to team
    for (const name of ["Alice", "Bob", "Charlie"]) {
      const user = await createManagedUser(name);
      await addUserToTeam(user.user.id);
      managedUsers.push(user);
    }
  });

  afterAll(async () => {
    await Promise.all(managedUsers.map((u) => userRepositoryFixture.delete(u.user.id)));
    await userRepositoryFixture.delete(platformAdmin.id);
    await oauthClientRepositoryFixture.delete(oAuthClient.id);
    await teamRepositoryFixture.delete(organization.id);
    await app.close();
  });

  describe("when creating round robin event type", () => {
    it("sets maxRoundRobinHosts when provided", async () => {
      const eventType = await createRoundRobinEventType({ maxRoundRobinHosts: 2 });

      expect(eventType.schedulingType).toEqual("roundRobin");
      expect(eventType.hosts.length).toEqual(3);
      expect(eventType.maxRoundRobinHosts).toEqual(2);
    });

    it("returns null for maxRoundRobinHosts when not provided", async () => {
      const eventType = await createRoundRobinEventType();

      expect(eventType.maxRoundRobinHosts).toBeNull();
    });
  });

  describe("when updating round robin event type", () => {
    it("updates maxRoundRobinHosts value", async () => {
      const eventType = await createRoundRobinEventType({ maxRoundRobinHosts: 1 });
      const updated = await updateEventType(eventType.id, { maxRoundRobinHosts: 3 });

      expect(updated.maxRoundRobinHosts).toEqual(3);
    });
  });

  describe("validation", () => {
    it("rejects maxRoundRobinHosts greater than 20", async () => {
      const response = await request(app.getHttpServer())
        .post(`/v2/organizations/${organization.id}/teams/${managedTeam.id}/event-types`)
        .send({
          title: "Round Robin Event",
          slug: `max-rr-validation-${randomString()}`,
          lengthInMinutes: 30,
          schedulingType: SchedulingType.ROUND_ROBIN,
          assignAllTeamMembers: true,
          maxRoundRobinHosts: 25,
        })
        .set(X_CAL_SECRET_KEY, oAuthClient.secret)
        .set(X_CAL_CLIENT_ID, oAuthClient.id);

      expect(response.status).toEqual(400);
    });

    it("accepts maxRoundRobinHosts at maximum limit (20)", async () => {
      const eventType = await createRoundRobinEventType({ maxRoundRobinHosts: 20 });
      expect(eventType.maxRoundRobinHosts).toEqual(20);
    });
  });
});