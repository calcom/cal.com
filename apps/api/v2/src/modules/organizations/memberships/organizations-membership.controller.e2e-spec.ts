import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { Attribute, AttributeOption, Membership, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AttributeRepositoryFixture } from "test/fixtures/repository/attributes.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { OrganizationsDelegationCredentialService } from "@/modules/organizations/delegation-credentials/services/organizations-delegation-credential.service";
import { CreateOrgMembershipDto } from "@/modules/organizations/memberships/inputs/create-organization-membership.input";
import { UpdateOrgMembershipDto } from "@/modules/organizations/memberships/inputs/update-organization-membership.input";
import { CreateOrgMembershipOutput } from "@/modules/organizations/memberships/outputs/create-membership.output";
import { DeleteOrgMembership } from "@/modules/organizations/memberships/outputs/delete-membership.output";
import { GetAllOrgMemberships } from "@/modules/organizations/memberships/outputs/get-all-memberships.output";
import { GetOrgMembership } from "@/modules/organizations/memberships/outputs/get-membership.output";
import { OrgUserAttribute } from "@/modules/organizations/memberships/outputs/organization-membership.output";
import { UpdateOrgMembership } from "@/modules/organizations/memberships/outputs/update-membership.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TeamMembershipOutput } from "@/modules/teams/memberships/outputs/team-membership.output";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Organizations Memberships Endpoints", () => {
  describe("User Authentication - User is Org Admin", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let membershipRepositoryFixture: MembershipRepositoryFixture;
    let attributesRepositoryFixture: AttributeRepositoryFixture;

    let org: Team;
    let membership: Membership;
    let membership2: Membership;
    let membershipCreatedViaApi: TeamMembershipOutput;

    const userEmail = `organizations-memberships-admin-${randomString()}@api.com`;
    const userEmail2 = `organizations-memberships-member-${randomString()}@api.com`;
    const invitedUserEmail = `organizations-memberships-invited-${randomString()}@api.com`;

    let user: User;
    let user2: User;

    let userToInviteViaApi: User;

    let textAttribute: Attribute;
    let multiSelectAttribute: Attribute;
    let numberAttribute: Attribute;
    let singleSelectAttribute: Attribute;

    let textAttributeOption: AttributeOption;
    let multiSelectAttributeOption: AttributeOption;
    let multiSelectAttributeOption2: AttributeOption;
    let numberAttributeOption: AttributeOption;
    let singleSelectAttributeOption: AttributeOption;

    const metadata = {
      some: "key",
    };
    const bio = "This is a bio";

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      attributesRepositoryFixture = new AttributeRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        bio,
        metadata,
      });
      user2 = await userRepositoryFixture.create({
        email: userEmail2,
        username: userEmail2,
        bio,
        metadata,
      });

      userToInviteViaApi = await userRepositoryFixture.create({
        email: invitedUserEmail,
        username: invitedUserEmail,
        bio,
        metadata,
      });

      org = await organizationsRepositoryFixture.create({
        name: `organizations-memberships-organization-${randomString()}`,
        isOrganization: true,
      });

      await setupAttributes();

      membership = await membershipRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
      });

      membership2 = await membershipRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user2.id } },
        team: { connect: { id: org.id } },
        AttributeToUser: {
          create: [
            {
              attributeOption: { connect: { id: textAttributeOption.id } },
              weight: 100,
            },
            {
              attributeOption: { connect: { id: multiSelectAttributeOption.id } },
              weight: 100,
            },
            {
              attributeOption: { connect: { id: multiSelectAttributeOption2.id } },
              weight: null,
            },
            {
              attributeOption: { connect: { id: numberAttributeOption.id } },
              weight: 100,
            },
            {
              attributeOption: { connect: { id: singleSelectAttributeOption.id } },
              weight: 100,
            },
          ],
        },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    async function setupAttributes(): Promise<void> {
      textAttribute = await attributesRepositoryFixture.create({
        team: { connect: { id: org.id } },
        type: "TEXT",
        name: "team",
        slug: `team-${randomString()}`,
        enabled: true,
        usersCanEditRelation: false,
        isWeightsEnabled: false,
        isLocked: false,
      });

      multiSelectAttribute = await attributesRepositoryFixture.create({
        team: { connect: { id: org.id } },
        type: "MULTI_SELECT",
        name: "skills",
        slug: `skills-${randomString()}`,
        enabled: true,
        usersCanEditRelation: false,
        isWeightsEnabled: false,
        isLocked: false,
      });

      numberAttribute = await attributesRepositoryFixture.create({
        team: { connect: { id: org.id } },
        type: "NUMBER",
        name: "age",
        slug: `age-${randomString()}`,
        enabled: true,
        usersCanEditRelation: false,
        isWeightsEnabled: false,
        isLocked: false,
      });

      singleSelectAttribute = await attributesRepositoryFixture.create({
        team: { connect: { id: org.id } },
        type: "SINGLE_SELECT",
        name: "frontend",
        slug: `frontend-${randomString()}`,
        enabled: true,
        usersCanEditRelation: false,
        isWeightsEnabled: false,
        isLocked: false,
      });

      textAttributeOption = await attributesRepositoryFixture.createOption({
        attribute: { connect: { id: textAttribute.id } },
        value: "coders",
        slug: "coders",
        isGroup: false,
      });

      multiSelectAttributeOption = await attributesRepositoryFixture.createOption({
        attribute: { connect: { id: multiSelectAttribute.id } },
        value: "javascript",
        slug: "javascript",
        isGroup: false,
      });

      multiSelectAttributeOption2 = await attributesRepositoryFixture.createOption({
        attribute: { connect: { id: multiSelectAttribute.id } },
        value: "typescript",
        slug: "typescript",
        isGroup: false,
      });

      numberAttributeOption = await attributesRepositoryFixture.createOption({
        attribute: { connect: { id: numberAttribute.id } },
        value: "18",
        slug: "18",
        isGroup: false,
      });

      singleSelectAttributeOption = await attributesRepositoryFixture.createOption({
        attribute: { connect: { id: singleSelectAttribute.id } },
        value: "yes",
        slug: "yes",
        isGroup: false,
      });
    }

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(organizationsRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
      expect(org).toBeDefined();
    });

    it("should get all the memberships of the org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships`)
        .expect(200)
        .then((response) => {
          const responseBody: GetAllOrgMemberships = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data[0].id).toEqual(membership.id);
          expect(responseBody.data[0].userId).toEqual(user.id);
          expect(responseBody.data[0].role).toEqual("ADMIN");
          expect(responseBody.data[0].user.bio).toEqual(bio);
          expect(responseBody.data[0].user.metadata).toEqual(metadata);
          expect(responseBody.data[0].user.email).toEqual(user.email);
          expect(responseBody.data[0].user.username).toEqual(user.username);
          expect(responseBody.data[0].teamId).toEqual(org.id);
          expect(responseBody.data[1].id).toEqual(membership2.id);
          expect(responseBody.data[1].userId).toEqual(user2.id);
          expect(responseBody.data[1].role).toEqual("MEMBER");
          expect(responseBody.data[1].user.bio).toEqual(bio);
          expect(responseBody.data[1].user.metadata).toEqual(metadata);
          expect(responseBody.data[1].user.email).toEqual(user2.email);
          expect(responseBody.data[1].user.username).toEqual(user2.username);
          expect(responseBody.data[1].teamId).toEqual(org.id);
          userHasCorrectAttributes(responseBody.data[1].attributes);
        });
    });

    function userHasCorrectAttributes(attributes: OrgUserAttribute[]): void {
      expect(attributes.length).toEqual(4);
      const responseNumberAttribute = attributes.find((attr) => attr.type === "number");
      const responseSingleSelectAttribute = attributes.find((attr) => attr.type === "singleSelect");
      const responseMultiSelectAttribute = attributes.find((attr) => attr.type === "multiSelect");
      const responseTextAttribute = attributes.find((attr) => attr.type === "text");
      expect(responseNumberAttribute).toEqual({
        id: numberAttribute.id,
        name: numberAttribute.name,
        optionId: numberAttributeOption.id,
        option: +numberAttributeOption.value,
        type: "number",
      });
      expect(responseSingleSelectAttribute).toEqual({
        id: singleSelectAttribute.id,
        name: singleSelectAttribute.name,
        optionId: singleSelectAttributeOption.id,
        option: singleSelectAttributeOption.value,
        type: "singleSelect",
      });
      expect(responseMultiSelectAttribute).toEqual({
        id: multiSelectAttribute.id,
        name: multiSelectAttribute.name,
        options: [
          {
            optionId: multiSelectAttributeOption2.id,
            option: multiSelectAttributeOption2.value,
          },
          {
            optionId: multiSelectAttributeOption.id,
            option: multiSelectAttributeOption.value,
          },
        ],
        type: "multiSelect",
      });
      expect(responseTextAttribute).toEqual({
        id: textAttribute.id,
        name: textAttribute.name,
        optionId: textAttributeOption.id,
        option: textAttributeOption.value,
        type: "text",
      });
    }

    it("should get all the memberships of the org paginated", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships?skip=1&take=1`)
        .expect(200)
        .then((response) => {
          const responseBody: GetAllOrgMemberships = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data[0].id).toEqual(membership2.id);
          expect(responseBody.data[0].role).toEqual("MEMBER");
          expect(responseBody.data[0].user.bio).toEqual(bio);
          expect(responseBody.data[0].user.metadata).toEqual(metadata);
          expect(responseBody.data[0].user.email).toEqual(user2.email);
          expect(responseBody.data[0].user.username).toEqual(user2.username);
          expect(responseBody.data[0].userId).toEqual(user2.id);
          expect(responseBody.data[0].teamId).toEqual(org.id);
        });
    });

    it("should fail if org does not exist", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/120494059/memberships`).expect(403);
    });

    it("should get the membership of the org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships/${membership.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: GetOrgMembership = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(membership.id);
          expect(responseBody.data.userId).toEqual(user.id);
          expect(responseBody.data.role).toEqual("ADMIN");
          expect(responseBody.data.user.bio).toEqual(bio);
          expect(responseBody.data.user.metadata).toEqual(metadata);
          expect(responseBody.data.user.email).toEqual(user.email);
          expect(responseBody.data.user.username).toEqual(user.username);
          expect(responseBody.data.teamId).toEqual(org.id);
        });
    });

    it("should get the membership of the org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships/${membership2.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: GetOrgMembership = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(membership2.id);
          expect(responseBody.data.userId).toEqual(user2.id);
          expect(responseBody.data.role).toEqual("MEMBER");
          expect(responseBody.data.user.bio).toEqual(bio);
          expect(responseBody.data.user.metadata).toEqual(metadata);
          expect(responseBody.data.user.email).toEqual(user2.email);
          expect(responseBody.data.user.username).toEqual(user2.username);
          expect(responseBody.data.teamId).toEqual(org.id);
          userHasCorrectAttributes(responseBody.data.attributes);
        });
    });

    it("should create the membership of the org", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/memberships`)
        .send({
          userId: userToInviteViaApi.id,
          accepted: true,
          role: "MEMBER",
        } satisfies CreateOrgMembershipDto)
        .expect(201)
        .then((response) => {
          const responseBody: CreateOrgMembershipOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          membershipCreatedViaApi = responseBody.data;
          expect(membershipCreatedViaApi.teamId).toEqual(org.id);
          expect(membershipCreatedViaApi.role).toEqual("MEMBER");
          expect(membershipCreatedViaApi.userId).toEqual(userToInviteViaApi.id);
          expect(membershipCreatedViaApi.user.bio).toEqual(bio);
          expect(membershipCreatedViaApi.user.metadata).toEqual(metadata);
          expect(membershipCreatedViaApi.user.email).toEqual(userToInviteViaApi.email);
          expect(membershipCreatedViaApi.user.username).toEqual(userToInviteViaApi.username);
        });
    });

    it("should call ensureDefaultCalendarsForUser when creating membership", async () => {
      const newUserEmail = `organizations-memberships-calendars-${randomString()}@api.com`;
      const newUser = await userRepositoryFixture.create({
        email: newUserEmail,
        username: newUserEmail,
        bio,
        metadata,
      });

      const ensureDefaultCalendarsSpy = jest
        .spyOn(OrganizationsDelegationCredentialService.prototype, "ensureDefaultCalendarsForUser")
        .mockResolvedValue(undefined);

      try {
        await request(app.getHttpServer())
          .post(`/v2/organizations/${org.id}/memberships`)
          .send({
            userId: newUser.id,
            accepted: true,
            role: "MEMBER",
          } satisfies CreateOrgMembershipDto)
          .expect(201);

        expect(ensureDefaultCalendarsSpy).toHaveBeenCalledWith(org.id, newUser.id, newUserEmail);
      } finally {
        ensureDefaultCalendarsSpy.mockRestore();
        await membershipRepositoryFixture.delete(
          (await membershipRepositoryFixture.getUserMembershipByTeamId(newUser.id, org.id))?.id ?? 0
        );
        await userRepositoryFixture.deleteByEmail(newUserEmail);
      }
    });

    it("should update the membership of the org", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/memberships/${membershipCreatedViaApi.id}`)
        .send({
          role: "OWNER",
        } satisfies UpdateOrgMembershipDto)
        .expect(200)
        .then((response) => {
          const responseBody: UpdateOrgMembership = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          membershipCreatedViaApi = responseBody.data;
          expect(membershipCreatedViaApi.role).toEqual("OWNER");
        });
    });

    it("should delete the membership of the org we created via api", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/memberships/${membershipCreatedViaApi.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: DeleteOrgMembership = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(membershipCreatedViaApi.id);
        });
    });

    it("should fail to get the membership of the org we just deleted", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships/${membershipCreatedViaApi.id}`)
        .expect(404);
    });

    it("should fail if the membership does not exist", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships/123132145`)
        .expect(404);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await userRepositoryFixture.deleteByEmail(user2.email);
      await userRepositoryFixture.deleteByEmail(userToInviteViaApi.email);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});

describe("Organizations Memberships Endpoints", () => {
  describe("User Authentication - User is Org Member", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let membershipRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let membership: Membership;

    const userEmail = `organizations-memberships-member-${randomString()}@api.com`;
    let user: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: `organizations-memberships-organization-${randomString()}`,
        isOrganization: true,
      });

      membership = await membershipRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
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

    it("should deny get all the memberships of the org", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/${org.id}/memberships`).expect(403);
    });

    it("should deny get all the memberships of the org paginated", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships?skip=1&take=1`)
        .expect(403);
    });

    it("should deny get the membership of the org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/memberships/${membership.id}`)
        .expect(403);
    });

    it("should deny create the membership for the org", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/memberships`)
        .send({
          role: "OWNER",
          userId: user.id,
          accepted: true,
        } satisfies CreateOrgMembershipDto)
        .expect(403);
    });

    it("should deny update the membership of the org", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/memberships/${membership.id}`)
        .send({
          role: "MEMBER",
        } satisfies Partial<CreateOrgMembershipDto>)
        .expect(403);
    });

    it("should deny delete the membership of the org we created via api", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/memberships/${membership.id}`)
        .expect(403);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});
