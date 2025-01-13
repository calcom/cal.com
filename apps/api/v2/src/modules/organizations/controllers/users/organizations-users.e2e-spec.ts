import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { EmailService } from "@/modules/email/email.service";
import { GetOrgUsersWithProfileOutput } from "@/modules/organizations/outputs/get-organization-users.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { User, Team, EventType } from "@calcom/prisma/client";

describe("Organizations Users Endpoints", () => {
  describe("Member role", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let membershipFixtures: MembershipRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;

    const userEmail = "member1@org.com";
    let user: User;
    let org: Team;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      membershipFixtures = new MembershipRepositoryFixture(moduleRef);
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);

      org = await organizationsRepositoryFixture.create({
        name: "Test org 3",
        isOrganization: true,
      });

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        organization: { connect: { id: org.id } },
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

      await membershipFixtures.addUserToOrg(user, org, "MEMBER", true);
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

    it("should not be able to find org users", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/${org.id}/users`).expect(403);
    });

    it("should not be able to create a new org user", async () => {
      return request(app.getHttpServer()).post(`/v2/organizations/${org.id}/users`).expect(403);
    });

    it("should not be able to update an org user", async () => {
      return request(app.getHttpServer()).patch(`/v2/organizations/${org.id}/users/${user.id}`).expect(403);
    });

    it("should not be able to delete an org user", async () => {
      return request(app.getHttpServer()).delete(`/v2/organizations/${org.id}/users/${user.id}`).expect(403);
    });

    afterAll(async () => {
      // await membershipFixtures.delete(membership.id);
      await Promise.all([userRepositoryFixture.deleteByEmail(user.email)]);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();

      await app.close();
    });
  });
  describe("Admin role", () => {
    let app: INestApplication;
    let profileRepositoryFixture: ProfileRepositoryFixture;
    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let membershipFixtures: MembershipRepositoryFixture;

    const userEmail = "admin1@org.com";
    const nonMemberEmail = "non-member@test.com";
    let user: User;
    let org: Team;
    let createdUser: User;

    const orgMembersData = [
      {
        email: "member1@org.com",
        username: "member1@org.com",
      },
      {
        email: "member2@org.com",
        username: "member2@org.com",
      },
      {
        email: "member3@org.com",
        username: "member3@org.com",
      },
    ];

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);

      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      membershipFixtures = new MembershipRepositoryFixture(moduleRef);

      org = await organizationsRepositoryFixture.create({
        name: "Test org 2",
        isOrganization: true,
      });

      await userRepositoryFixture.create({
        email: nonMemberEmail,
        username: "non-member",
      });

      const orgMembers = await Promise.all(
        orgMembersData.map((member) =>
          userRepositoryFixture.create({
            email: member.email,
            username: member.username,
            organization: { connect: { id: org.id } },
          })
        )
      );
      // create profiles of orgMember like they would be when being invied to the org
      await Promise.all(
        orgMembers.map((member) =>
          profileRepositoryFixture.create({
            uid: `usr-${member.id}`,
            username: member.username ?? `usr-${member.id}`,
            organization: {
              connect: {
                id: org.id,
              },
            },
            user: {
              connect: {
                id: member.id,
              },
            },
          })
        )
      );

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        organization: { connect: { id: org.id } },
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

      await membershipFixtures.addUserToOrg(user, org, "ADMIN", true);
      await Promise.all(
        orgMembers.map((member) => membershipFixtures.addUserToOrg(member, org, "MEMBER", true))
      );

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

    it("should get all org users", async () => {
      const { body } = await request(app.getHttpServer()).get(`/v2/organizations/${org.id}/users`);

      const userData = body.data as GetOrgUsersWithProfileOutput[];

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(userData.length).toBe(4);
      console.log(
        "profiles",
        { userData },
        userData.map((u) => u.profile)
      );
      expect(userData.find((u) => u.profile.username === "member1@org.com")).toBeDefined();
      expect(userData.find((u) => u.profile.username === "member2@org.com")).toBeDefined();
      expect(userData.find((u) => u.profile.username === "member3@org.com")).toBeDefined();

      expect(userData.filter((user: { email: string }) => user.email === nonMemberEmail).length).toBe(0);
    });

    it("should only get users with the specified email", async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/users`)
        .query({
          emails: userEmail,
        })
        .set("Content-Type", "application/json")
        .set("Accept", "application/json");

      const userData = body.data as GetOrgUsersWithProfileOutput[];

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(userData.length).toBe(1);

      expect(userData.filter((user) => user.email === userEmail).length).toBe(1);
      expect(userData.find((u) => u.profile.username === user.username)).toBeDefined();
    });

    it("should get users within the specified emails array", async () => {
      const orgMemberEmail = orgMembersData[0].email;

      const { body } = await request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/users`)
        .query({
          emails: [userEmail, orgMemberEmail],
        })
        .set("Content-Type", "application/json")
        .set("Accept", "application/json");

      const userData = body.data;

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(userData.length).toBe(2);

      expect(userData.filter((user: { email: string }) => user.email === userEmail).length).toBe(1);
      expect(userData.filter((user: { email: string }) => user.email === orgMemberEmail).length).toBe(1);
    });

    it("should update an org user", async () => {
      const { body } = await request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/users/${user.id}`)
        .send({
          theme: "light",
        })
        .set("Content-Type", "application/json")
        .set("Accept", "application/json");

      const userData = body.data as User;
      expect(body.status).toBe(SUCCESS_STATUS);
      expect(userData.theme).toBe("light");
    });

    it("should create a new org user", async () => {
      const newOrgUser = {
        email: "new-org-member-b@org.com",
        organizationRole: "MEMBER",
        autoAccept: true,
      };

      const emailSpy = jest
        .spyOn(EmailService.prototype, "sendSignupToOrganizationEmail")
        .mockImplementation(() => Promise.resolve());
      const { body } = await request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users`)
        .send({
          email: newOrgUser.email,
        })
        .set("Content-Type", "application/json")
        .set("Accept", "application/json");

      const userData = body.data;
      expect(body.status).toBe(SUCCESS_STATUS);
      expect(userData.email).toBe(newOrgUser.email);
      expect(emailSpy).toHaveBeenCalledWith({
        usernameOrEmail: newOrgUser.email,
        orgName: org.name,
        orgId: org.id,
        inviterName: "admin1@org.com",
        locale: null,
      });
      createdUser = userData;
    });

    it("should delete an org user", async () => {
      const { body } = await request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/users/${createdUser.id}`)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json");

      const userData = body.data as User;
      expect(body.status).toBe(SUCCESS_STATUS);
      expect(userData.id).toBe(createdUser.id);
    });

    afterAll(async () => {
      // await membershipFixtures.delete(membership.id);
      await Promise.all([
        userRepositoryFixture.deleteByEmail(user.email),
        userRepositoryFixture.deleteByEmail(nonMemberEmail),
        ...orgMembersData.map((member) => userRepositoryFixture.deleteByEmail(member.email)),
      ]);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });

  describe("Member event-types", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let membershipFixtures: MembershipRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;

    const authEmail = "auth@org.com";
    let user: User;
    let org: Team;
    let team: Team;
    let managedEventType: EventType;
    let createdUser: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        authEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);

      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      membershipFixtures = new MembershipRepositoryFixture(moduleRef);
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);

      org = await organizationsRepositoryFixture.create({
        name: "Test org 4",
        isOrganization: true,
      });

      team = await teamsRepositoryFixture.create({
        name: "Test org 4 team",
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      user = await userRepositoryFixture.create({
        email: authEmail,
        username: authEmail,
        organization: { connect: { id: org.id } },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${user.id}`,
        username: authEmail,
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

      await membershipFixtures.addUserToOrg(user, org, "ADMIN", true);

      await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: team.id },
        },
        title: "Collective Event Type",
        slug: "collective-event-type",
        length: 30,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      managedEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "MANAGED",
        team: {
          connect: { id: team.id },
        },
        title: "Managed Event Type",
        slug: "managed-event-type",
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
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

    it("should create a new org user with team event-types", async () => {
      const newOrgUser = {
        email: "new-org-member-d@org.com",
        organizationRole: "MEMBER",
        autoAccept: true,
      };

      const { body } = await request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users`)
        .send({
          email: newOrgUser.email,
        })
        .set("Content-Type", "application/json")
        .set("Accept", "application/json");

      const userData = body.data;
      expect(body.status).toBe(SUCCESS_STATUS);
      createdUser = userData;
      teamHasCorrectEventTypes(team.id);
    });

    async function teamHasCorrectEventTypes(teamId: number) {
      const eventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(teamId);
      expect(eventTypes?.length).toEqual(2);
    }

    afterAll(async () => {
      // await membershipFixtures.delete(membership.id);
      await userRepositoryFixture.deleteByEmail(user.email);
      await userRepositoryFixture.deleteByEmail(createdUser.email);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();

      await app.close();
    });
  });
});
