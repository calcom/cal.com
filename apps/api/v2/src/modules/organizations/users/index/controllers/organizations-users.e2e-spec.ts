import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { EmailService } from "@/modules/email/email.service";
import { GetOrgUsersWithProfileOutput } from "@/modules/organizations/users/index/outputs/get-organization-users.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { CreateUserInput } from "@/modules/users/inputs/create-user.input";
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
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { User, Team, EventType } from "@calcom/prisma/client";

describe("Organizations Users Endpoints", () => {
  const bio = "I am a bio";
  const metadata = { foo: "bar" };

  describe("Member role", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let membershipFixtures: MembershipRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;

    const userEmail = `organizations-users-member-${randomString()}@api.com`;
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
        name: `organizations-users-organization-${randomString()}`,
        isOrganization: true,
      });

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        organization: { connect: { id: org.id } },
        bio,
        metadata,
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

    const userEmail = `organizations-users-admin-${randomString()}@api.com`;
    const nonMemberEmail = `organizations-users-non-member-${randomString()}@api.com`;
    let user: User;
    let org: Team;
    let createdUser: User;

    const orgMembersData = [
      {
        email: `organizations-users-member1-${randomString()}@api.com`,
        username: `organizations-users-member1-${randomString()}@api.com`,
      },
      {
        email: `organizations-users-member2-${randomString()}@api.com`,
        username: `organizations-users-member2-${randomString()}@api.com`,
      },
      {
        email: `organizations-users-member3-${randomString()}@api.com`,
        username: `organizations-users-member3-${randomString()}@api.com`,
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
        name: `organizations-users-admin-organization-${randomString()}`,
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
            bio,
            metadata,
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
        bio,
        metadata,
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
      // Find and verify each member's data
      const member0 = userData.find((u) => u.profile.username === orgMembersData[0].username);
      const member1 = userData.find((u) => u.profile.username === orgMembersData[1].username);
      const member2 = userData.find((u) => u.profile.username === orgMembersData[2].username);

      // Verify member 0
      expect(member0).toBeDefined();
      expect(member0?.email).toBe(orgMembersData[0].email);
      expect(member0?.profile.username).toBe(orgMembersData[0].username);
      expect(member0?.bio).toBe(bio);
      expect(member0?.metadata).toEqual(metadata);

      // Verify member 1
      expect(member1).toBeDefined();
      expect(member1?.email).toBe(orgMembersData[1].email);
      expect(member1?.profile.username).toBe(orgMembersData[1].username);
      expect(member1?.bio).toBe(bio);
      expect(member1?.metadata).toEqual(metadata);

      // Verify member 2
      expect(member2).toBeDefined();
      expect(member2?.email).toBe(orgMembersData[2].email);
      expect(member2?.profile.username).toBe(orgMembersData[2].username);
      expect(member2?.bio).toBe(bio);
      expect(member2?.metadata).toEqual(metadata);

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

      const foundUser = userData.find((u) => u.email === userEmail);
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(userEmail);
      expect(foundUser?.profile.username).toBe(user.username);
      expect(foundUser?.bio).toBe(bio);
      expect(foundUser?.metadata).toEqual(metadata);
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

      const adminUser = userData.find((u: GetOrgUsersWithProfileOutput) => u.email === userEmail);
      const orgMember = userData.find((u: GetOrgUsersWithProfileOutput) => u.email === orgMemberEmail);

      expect(adminUser).toBeDefined();
      expect(adminUser?.email).toBe(userEmail);
      expect(adminUser?.profile.username).toBe(user.username);
      expect(adminUser?.bio).toBe(bio);
      expect(adminUser?.metadata).toEqual(metadata);

      expect(orgMember).toBeDefined();
      expect(orgMember?.email).toBe(orgMemberEmail);
      expect(orgMember?.profile.username).toBe(orgMembersData[0].username);
      expect(orgMember?.bio).toBe(bio);
      expect(orgMember?.metadata).toEqual(metadata);
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
      const newOrgUser: CreateUserInput = {
        email: `organizations-users-new-member-${randomString()}@api.com`,
        bio,
        metadata,
      };

      const emailSpy = jest
        .spyOn(EmailService.prototype, "sendSignupToOrganizationEmail")
        .mockImplementation(() => Promise.resolve());
      const { body } = await request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users`)
        .send(newOrgUser)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json");

      const userData = body.data;
      expect(body.status).toBe(SUCCESS_STATUS);
      expect(userData.email).toBe(newOrgUser.email);
      expect(userData.bio).toBe(newOrgUser.bio);
      expect(userData.metadata).toEqual(newOrgUser.metadata);
      expect(emailSpy).toHaveBeenCalledWith({
        usernameOrEmail: newOrgUser.email,
        orgName: org.name,
        orgId: org.id,
        inviterName: userEmail,
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

    const authEmail = `organizations-users-auth-${randomString()}@api.com`;
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
        name: `organizations-users-organization-${randomString()}`,
        isOrganization: true,
      });

      team = await teamsRepositoryFixture.create({
        name: `organizations-users-team-${randomString()}`,
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
        email: `organizations-users-new-member-${randomString()}@api.com`,
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
