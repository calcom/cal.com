import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { CreatePrivateLinkInput } from "@calcom/platform-types";

describe("Organizations / Teams / Event Types / Private Links Endpoints", () => {
  let app: INestApplication;

  let orgFixture: OrganizationRepositoryFixture;
  let teamFixture: TeamRepositoryFixture;
  let userFixture: UserRepositoryFixture;
  let eventTypesFixture: EventTypesRepositoryFixture;

  let org: any;
  let team: any;
  let user: any;
  let eventType: any;

  const userEmail = `org-private-links-user-${randomString()}@api.com`;

  beforeAll(async () => {
    const testingModuleBuilder = withApiAuth(
      userEmail,
      Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter],
        imports: [AppModule, UsersModule, TokensModule],
      })
    )
      // Bypass org admin plan and admin API checks and roles in this e2e
      .overrideGuard(PlatformPlanGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(IsAdminAPIEnabledGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      // Keep IsOrgGuard and IsTeamInOrg to validate org/team path integrity
      .overrideGuard(ApiAuthGuard)
      .useValue({ canActivate: () => true });

    const moduleRef = await testingModuleBuilder.compile();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    orgFixture = new OrganizationRepositoryFixture(moduleRef);
    teamFixture = new TeamRepositoryFixture(moduleRef);
    userFixture = new UserRepositoryFixture(moduleRef);
    eventTypesFixture = new EventTypesRepositoryFixture(moduleRef);

    user = await userFixture.create({
      email: userEmail,
      username: `org-private-links-user-${randomString()}`,
      name: "Test User",
    });

    org = await orgFixture.create({
      name: `org-private-links-org-${randomString()}`,
      slug: `org-private-links-org-${randomString()}`,
      isOrganization: true,
    });

    team = await teamFixture.create({
      name: `org-private-links-team-${randomString()}`,
      isOrganization: false,
      parent: { connect: { id: org.id } },
    });

    // Create a team-owned event type
    eventType = await eventTypesFixture.createTeamEventType({
      title: `org-private-links-event-type-${randomString()}`,
      slug: `org-private-links-event-type-${randomString()}`,
      length: 30,
      locations: [],
      team: { connect: { id: team.id } },
    });

    await app.init();
  });

  it("POST /v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links - create", async () => {
    const body: CreatePrivateLinkInput = { maxUsageCount: 5 };
    const response = await request(app.getHttpServer())
      .post(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${eventType.id}/private-links`)
      .set("Authorization", "Bearer test")
      .send(body)
      .expect(201);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.linkId).toBeDefined();
    expect(response.body.data.maxUsageCount).toBe(5);
    expect(response.body.data.usageCount).toBeDefined();
  });

  it("GET /v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links - list", async () => {
    const response = await request(app.getHttpServer())
      .get(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${eventType.id}/private-links`)
      .set("Authorization", "Bearer test")
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("PATCH /v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links/:linkId - update", async () => {
    // create first
    const createResp = await request(app.getHttpServer())
      .post(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${eventType.id}/private-links`)
      .set("Authorization", "Bearer test")
      .send({ maxUsageCount: 3 })
      .expect(201);

    const linkId = createResp.body.data.linkId as string;

    const response = await request(app.getHttpServer())
      .patch(
        `/v2/organizations/${org.id}/teams/${team.id}/event-types/${eventType.id}/private-links/${linkId}`
      )
      .set("Authorization", "Bearer test")
      .send({ maxUsageCount: 10 })
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.maxUsageCount).toBe(10);
  });

  it("DELETE /v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links/:linkId - delete", async () => {
    // create first
    const createResp = await request(app.getHttpServer())
      .post(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${eventType.id}/private-links`)
      .set("Authorization", "Bearer test")
      .send({ maxUsageCount: 2 })
      .expect(201);

    const linkId = createResp.body.data.linkId as string;

    const response = await request(app.getHttpServer())
      .delete(
        `/v2/organizations/${org.id}/teams/${team.id}/event-types/${eventType.id}/private-links/${linkId}`
      )
      .set("Authorization", "Bearer test")
      .expect(200);

    expect(response.body.status).toBe(SUCCESS_STATUS);
    expect(response.body.data.linkId).toBe(linkId);
  });

  afterAll(async () => {
    try {
      if (eventType?.id) {
        await eventTypesFixture.delete(eventType.id);
      }
      if (team?.id) {
        await teamFixture.delete(team.id);
      }
      if (org?.id) {
        await orgFixture.delete(org.id);
      }
      if (user?.email) {
        await userFixture.deleteByEmail(user.email);
      }
    } catch {}
    await app.close();
  });
});
