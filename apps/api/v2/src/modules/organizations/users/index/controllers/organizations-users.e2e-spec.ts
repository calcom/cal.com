import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { EmailService } from "@/modules/email/email.service";
import { GetOrgUsersWithProfileOutput } from "@/modules/organizations/users/index/outputs/get-organization-users.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { AttributeRepositoryFixture } from "test/fixtures/repository/attributes.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { createOrgUser, cleanupOrgTest, DEFAULT_BIO, DEFAULT_METADATA } from "test/helpers/org-user.helper";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { User, Team, AttributeOption, Membership } from "@calcom/prisma/client";

describe("Organizations Users Endpoints", () => {
  const createUserData = (overrides: Record<string, unknown> = {}) => ({
    email: `test-${randomString()}@api.com`,
    username: `test-${randomString()}`,
    bio: DEFAULT_BIO,
    metadata: DEFAULT_METADATA,
    ...overrides,
  });

  describe("Member role", () => {
    let app: INestApplication;
    let userFixture: UserRepositoryFixture;
    let orgFixture: OrganizationRepositoryFixture;
    let membershipFixture: MembershipRepositoryFixture;
    let profileFixture: ProfileRepositoryFixture;

    let user: User;
    let org: Team;

    const userEmail = `org-member-${randomString()}@api.com`;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userFixture = new UserRepositoryFixture(moduleRef);
      orgFixture = new OrganizationRepositoryFixture(moduleRef);
      membershipFixture = new MembershipRepositoryFixture(moduleRef);
      profileFixture = new ProfileRepositoryFixture(moduleRef);

      org = await orgFixture.create({
        name: `org-${randomString()}`,
        isOrganization: true,
      });

      const result = await createOrgUser(
        { user: userFixture, profile: profileFixture, membership: membershipFixture },
        org,
        { email: userEmail },
        "MEMBER"
      );
      user = result.user;

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    afterAll(async () => {
      await cleanupOrgTest({ user: userFixture, organization: orgFixture }, [user?.email], org?.id);
      await app.close();
    });

    it("returns 403 when listing org users", () => {
      return request(app.getHttpServer()).get(`/v2/organizations/${org.id}/users`).expect(403);
    });

    it("returns 403 when creating org user", () => {
      return request(app.getHttpServer()).post(`/v2/organizations/${org.id}/users`).expect(403);
    });

    it("returns 403 when updating org user", () => {
      return request(app.getHttpServer()).patch(`/v2/organizations/${org.id}/users/${user.id}`).expect(403);
    });

    it("returns 403 when deleting org user", () => {
      return request(app.getHttpServer()).delete(`/v2/organizations/${org.id}/users/${user.id}`).expect(403);
    });
  });

  describe("Admin role", () => {
    let app: INestApplication;
    let userFixture: UserRepositoryFixture;
    let orgFixture: OrganizationRepositoryFixture;
    let membershipFixture: MembershipRepositoryFixture;
    let profileFixture: ProfileRepositoryFixture;

    let user: User;
    let org: Team;
    let createdUserId: number;

    const userEmail = `org-admin-${randomString()}@api.com`;
    const nonMemberEmail = `non-member-${randomString()}@api.com`;
    const orgMembersData = [
      createUserData({ email: `member1-${randomString()}@api.com`, username: `member1-${randomString()}` }),
      createUserData({ email: `member2-${randomString()}@api.com`, username: `member2-${randomString()}` }),
      createUserData({ email: `member3-${randomString()}@api.com`, username: `member3-${randomString()}` }),
    ];

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userFixture = new UserRepositoryFixture(moduleRef);
      orgFixture = new OrganizationRepositoryFixture(moduleRef);
      membershipFixture = new MembershipRepositoryFixture(moduleRef);
      profileFixture = new ProfileRepositoryFixture(moduleRef);

      org = await orgFixture.create({
        name: `org-admin-${randomString()}`,
        isOrganization: true,
      });

      await userFixture.create({
        email: nonMemberEmail,
        username: `non-member-${randomString()}`,
      });

      const fixtures = { user: userFixture, profile: profileFixture, membership: membershipFixture };

      await Promise.all(
        orgMembersData.map((data) =>
          createOrgUser(fixtures, org, { email: data.email, username: data.username })
        )
      );

      const result = await createOrgUser(fixtures, org, { email: userEmail }, "ADMIN");
      user = result.user;

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    afterAll(async () => {
      await cleanupOrgTest(
        { user: userFixture, organization: orgFixture },
        [user?.email, nonMemberEmail, ...orgMembersData.map((m) => m.email)],
        org?.id
      );
      await app.close();
    });

    it("lists all org users with profile, bio and metadata, excluding non-members", async () => {
      const { body } = await request(app.getHttpServer()).get(`/v2/organizations/${org.id}/users`);

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(body.data).toHaveLength(4);

      for (const memberData of orgMembersData) {
        const member = body.data.find(
          (u: GetOrgUsersWithProfileOutput) => u.profile.username === memberData.username
        );
        expect(member).toBeDefined();
        expect(member.email).toBe(memberData.email);
        expect(member.profile.username).toBe(memberData.username);
        expect(member.bio).toBe(DEFAULT_BIO);
        expect(member.metadata).toEqual(DEFAULT_METADATA);
      }

      expect(body.data.find((u: User) => u.email === nonMemberEmail)).toBeUndefined();
    });

    it("filters users by single email with full data", async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/users`)
        .query({ emails: userEmail });

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(body.data).toHaveLength(1);

      const foundUser = body.data[0];
      expect(foundUser.email).toBe(userEmail);
      expect(foundUser.profile.username).toBe(user.username);
      expect(foundUser.bio).toBe(DEFAULT_BIO);
      expect(foundUser.metadata).toEqual(DEFAULT_METADATA);
    });

    it("filters users by multiple emails with full data", async () => {
      const orgMemberEmail = orgMembersData[0].email;

      const { body } = await request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/users`)
        .query({ emails: [userEmail, orgMemberEmail] });

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(body.data).toHaveLength(2);

      const adminUser = body.data.find((u: GetOrgUsersWithProfileOutput) => u.email === userEmail);
      const orgMember = body.data.find((u: GetOrgUsersWithProfileOutput) => u.email === orgMemberEmail);

      expect(adminUser.email).toBe(userEmail);
      expect(adminUser.profile.username).toBe(user.username);
      expect(adminUser.bio).toBe(DEFAULT_BIO);

      expect(orgMember.email).toBe(orgMemberEmail);
      expect(orgMember.profile.username).toBe(orgMembersData[0].username);
      expect(orgMember.bio).toBe(DEFAULT_BIO);
    });

    it("updates org user theme", async () => {
      const { body } = await request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/users/${user.id}`)
        .send({ theme: "light" });

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(body.data.theme).toBe("light");
    });

    it("creates org user and sends invitation email", async () => {
      const newUser = createUserData({ timeZone: "Europe/Rome" });
      const emailSpy = jest
        .spyOn(EmailService.prototype, "sendSignupToOrganizationEmail")
        .mockResolvedValue();

      const { body } = await request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users`)
        .send(newUser);

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(body.data.email).toBe(newUser.email);
      expect(body.data.bio).toBe(newUser.bio);
      expect(body.data.timeZone).toBe("Europe/Rome");
      expect(emailSpy).toHaveBeenCalledWith({
        usernameOrEmail: newUser.email,
        orgName: org.name,
        orgId: org.id,
        inviterName: userEmail,
        locale: null,
      });

      createdUserId = body.data.id;
    });

    it("creates org user with username, avatarUrl, locale and timeFormat", async () => {
      const newUser = {
        email: `avatar-user-${randomString()}@api.com`,
        username: `avatar-${randomString()}`,
        avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
        bio: DEFAULT_BIO,
        metadata: DEFAULT_METADATA,
        timeZone: "America/Sao_Paulo",
        timeFormat: 24,
        locale: "pt",
      };

      const emailSpy = jest
        .spyOn(EmailService.prototype, "sendSignupToOrganizationEmail")
        .mockResolvedValue();

      const { body } = await request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users`)
        .send(newUser);

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(body.data.username).toBe(newUser.username);
      expect(body.data.avatarUrl).toBe(newUser.avatarUrl);
      expect(body.data.timeFormat).toBe(24);
      expect(body.data.locale).toBe("pt");
      expect(emailSpy).toHaveBeenCalledWith(expect.objectContaining({ locale: "pt" }));

      await userFixture.deleteByEmail(newUser.email);
    });

    it("creates org user with base64 avatar", async () => {
      const base64Avatar =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      const newUser = createUserData({ avatarUrl: base64Avatar });

      jest.spyOn(EmailService.prototype, "sendSignupToOrganizationEmail").mockResolvedValue();

      const { body } = await request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users`)
        .send(newUser);

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(body.data.avatarUrl).toBe(base64Avatar);

      await userFixture.deleteByEmail(newUser.email);
    });

    it("deletes org user", async () => {
      const { body } = await request(app.getHttpServer()).delete(
        `/v2/organizations/${org.id}/users/${createdUserId}`
      );

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(body.data.id).toBe(createdUserId);
    });
  });

  describe("Member event-types", () => {
    let app: INestApplication;
    let userFixture: UserRepositoryFixture;
    let teamFixture: TeamRepositoryFixture;
    let orgFixture: OrganizationRepositoryFixture;
    let eventTypesFixture: EventTypesRepositoryFixture;
    let membershipFixture: MembershipRepositoryFixture;
    let profileFixture: ProfileRepositoryFixture;

    let user: User;
    let org: Team;
    let team: Team;
    let createdUserEmail: string;

    const authEmail = `org-event-${randomString()}@api.com`;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        authEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userFixture = new UserRepositoryFixture(moduleRef);
      teamFixture = new TeamRepositoryFixture(moduleRef);
      orgFixture = new OrganizationRepositoryFixture(moduleRef);
      eventTypesFixture = new EventTypesRepositoryFixture(moduleRef);
      membershipFixture = new MembershipRepositoryFixture(moduleRef);
      profileFixture = new ProfileRepositoryFixture(moduleRef);

      org = await orgFixture.create({
        name: `org-event-${randomString()}`,
        isOrganization: true,
      });

      team = await teamFixture.create({
        name: `team-${randomString()}`,
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      const result = await createOrgUser(
        { user: userFixture, profile: profileFixture, membership: membershipFixture },
        org,
        { email: authEmail },
        "ADMIN"
      );
      user = result.user;

      await eventTypesFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: { connect: { id: team.id } },
        title: "Collective Event Type",
        slug: "collective-event-type",
        length: 30,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      await eventTypesFixture.createTeamEventType({
        schedulingType: "MANAGED",
        team: { connect: { id: team.id } },
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

    afterAll(async () => {
      await cleanupOrgTest(
        { user: userFixture, organization: orgFixture },
        [user?.email, createdUserEmail],
        org?.id
      );
      await app.close();
    });

    it("creates user without affecting team event types", async () => {
      const newUser = createUserData();
      createdUserEmail = newUser.email;

      const { body } = await request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users`)
        .send({ email: newUser.email });

      expect(body.status).toBe(SUCCESS_STATUS);

      const eventTypes = await eventTypesFixture.getAllTeamEventTypes(team.id);
      expect(eventTypes).toHaveLength(2);
    });
  });

  describe("Org members with assigned attributes", () => {
    let app: INestApplication;
    let userFixture: UserRepositoryFixture;
    let orgFixture: OrganizationRepositoryFixture;
    let membershipFixture: MembershipRepositoryFixture;
    let teamFixture: TeamRepositoryFixture;
    let profileFixture: ProfileRepositoryFixture;
    let attributeFixture: AttributeRepositoryFixture;

    let user: User;
    let user2: User;
    let org: Team;
    let team: Team;
    let membership: Membership;
    let membership2: Membership;
    let assignedOption1: AttributeOption;
    let assignedOption2: AttributeOption;

    const authEmail = `org-attr-${randomString()}@api.com`;
    const user2Email = `org-attr2-${randomString()}@api.com`;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        authEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userFixture = new UserRepositoryFixture(moduleRef);
      orgFixture = new OrganizationRepositoryFixture(moduleRef);
      teamFixture = new TeamRepositoryFixture(moduleRef);
      membershipFixture = new MembershipRepositoryFixture(moduleRef);
      profileFixture = new ProfileRepositoryFixture(moduleRef);
      attributeFixture = new AttributeRepositoryFixture(moduleRef);

      org = await orgFixture.create({
        name: `org-attr-${randomString()}`,
        isOrganization: true,
      });

      team = await teamFixture.create({
        name: "org team",
        parent: { connect: { id: org.id } },
      });

      const fixtures = { user: userFixture, profile: profileFixture, membership: membershipFixture };

      // user1 is team member, user2 is not - affects teamIds filter tests
      const result1 = await createOrgUser(fixtures, org, { email: authEmail }, "ADMIN");
      user = result1.user;
      membership = result1.membership;

      await membershipFixture.create({
        role: "MEMBER",
        accepted: true,
        team: { connect: { id: team.id } },
        user: { connect: { id: user.id } },
      });

      const result2 = await createOrgUser(fixtures, org, { email: user2Email }, "ADMIN");
      user2 = result2.user;
      membership2 = result2.membership;

      const attribute = await attributeFixture.create({
        name: "Test Attribute",
        team: { connect: { id: org.id } },
        type: "TEXT",
        slug: `attr-${randomString()}`,
      });

      const attribute2 = await attributeFixture.create({
        name: "Test Attribute 2",
        team: { connect: { id: org.id } },
        type: "TEXT",
        slug: `attr2-${randomString()}`,
      });

      // option1: only user1 | option2: both users - affects AND/OR/NONE filter tests
      assignedOption1 = await attributeFixture.createOption({
        slug: "option1",
        value: "option1",
        attribute: { connect: { id: attribute.id } },
        assignedUsers: { create: { memberId: membership.id } },
      });

      assignedOption2 = await attributeFixture.createOption({
        slug: "optionA",
        value: "optionA",
        attribute: { connect: { id: attribute2.id } },
        assignedUsers: {
          createMany: { data: [{ memberId: membership.id }, { memberId: membership2.id }] },
        },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    afterAll(async () => {
      await cleanupOrgTest(
        { user: userFixture, organization: orgFixture },
        [user?.email, user2?.email],
        org?.id
      );
      await app.close();
    });

    it("filters by AND - returns only users with all specified options", async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/users`)
        .query({ assignedOptionIds: [assignedOption1.id], attributeQueryOperator: "AND" });

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].email).toBe(user.email);
      expect(body.data[0].profile.username).toBe(user.username);
    });

    it("filters by OR - returns users with any specified option", async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/users`)
        .query({
          assignedOptionIds: [assignedOption1.id, assignedOption2.id],
          attributeQueryOperator: "OR",
        });

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(body.data).toHaveLength(2);

      const emails = body.data.map((u: GetOrgUsersWithProfileOutput) => u.email);
      expect(emails).toContain(user.email);
      expect(emails).toContain(user2.email);
    });

    it("filters by OR and teamIds - returns only team members with options", async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/users`)
        .query({
          assignedOptionIds: [assignedOption1.id, assignedOption2.id],
          attributeQueryOperator: "OR",
          teamIds: [team.id],
        });

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].email).toBe(user.email);
    });

    it("filters by NONE - returns users without specified options", async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/users`)
        .query({
          assignedOptionIds: [assignedOption1.id, assignedOption2.id],
          attributeQueryOperator: "NONE",
        });

      expect(body.status).toBe(SUCCESS_STATUS);
      expect(body.data).toHaveLength(0);
    });
  });
});
