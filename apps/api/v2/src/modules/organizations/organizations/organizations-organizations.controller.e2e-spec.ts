import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateOrganizationInput } from "@/modules/organizations/organizations/inputs/create-organization.input";
import { ManagedOrganizationOutput } from "@/modules/organizations/organizations/outputs/managed-organization.output";
import { CreateOrgTeamDto } from "@/modules/organizations/teams/index/inputs/create-organization-team.input";
import { OrgMeTeamOutputDto } from "@/modules/organizations/teams/index/outputs/organization-team.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS, X_CAL_CLIENT_ID, X_CAL_SECRET_KEY } from "@calcom/platform-constants";
import { ApiSuccessResponse } from "@calcom/platform-types";
import { PlatformOAuthClient, Team } from "@calcom/prisma/client";

describe("Organizations Organizations Endpoints", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let teamsRepositoryFixture: TeamRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;

  let managerOrg: Team;
  let managedOrg: ManagedOrganizationOutput;

  const managerOrgAdminEmail = `organizations-organizations-admin-${randomString()}@api.com`;
  let managerOrgAdmin: User;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, TokensModule],
    }).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
    teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

    managerOrgAdmin = await userRepositoryFixture.create({
      email: managerOrgAdminEmail,
      username: managerOrgAdminEmail,
    });

    managerOrg = await organizationsRepositoryFixture.create({
      name: `organizations-organizations-organization-${randomString()}`,
      isOrganization: true,
    });

    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: managerOrgAdmin.id } },
      team: { connect: { id: managerOrg.id } },
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  it("should create managed organization ", async () => {
    const suffix = randomString();

    const orgName = `organizations organizations org ${suffix}`;
    const orgSlug = `organization-organizations-org-created-via-api-${suffix}`;
    const orgMetadata = JSON.stringify({ key: "value" });

    return request(app.getHttpServer())
      .post(`/v2/organizations/${managerOrg.id}/organizations`)
      .send({
        name: orgName,
        slug: orgSlug,
        metadata: orgMetadata,
      } satisfies CreateOrganizationInput)
      .expect(201)
      .then(async (response) => {
        const responseBody: ApiSuccessResponse<ManagedOrganizationOutput> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        managedOrg = responseBody.data;
        expect(managedOrg.id).toBeDefined();
        expect(managedOrg.name).toEqual(orgName);
        expect(managedOrg.slug).toEqual(orgSlug);
        expect(managedOrg.metadata).toEqual(orgMetadata);
        expect(managedOrg.apiKey).toBeDefined();

        // check that in database exists org with managed org id
        // check that in managed org table exists a record with managed org id and manager org id
        const membership = await membershipsRepositoryFixture.getUserMembershipByTeamId(
          managerOrgAdmin.id,
          managedOrg.id
        );
        // check that platform billing is setup correctly for managed and manager orgs
        // check that in database api key is generated for managed org
        expect(membership?.role ?? "").toEqual("OWNER");
        expect(membership?.accepted).toEqual(true);
      });
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(managerOrgAdmin.email);
    await organizationsRepositoryFixture.delete(managerOrg.id);
    await app.close();
  });
});
