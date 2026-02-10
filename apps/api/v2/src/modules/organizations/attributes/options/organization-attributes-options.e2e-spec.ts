import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { Attribute, AttributeOption, Membership, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AttributeRepositoryFixture } from "test/fixtures/repository/attributes.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CreateOrganizationAttributeOptionInput } from "@/modules/organizations/attributes/options/inputs/create-organization-attribute-option.input";
import { AssignOrganizationAttributeOptionToUserInput } from "@/modules/organizations/attributes/options/inputs/organizations-attributes-options-assign.input";
import { UpdateOrganizationAttributeOptionInput } from "@/modules/organizations/attributes/options/inputs/update-organizaiton-attribute-option.input.ts";
import { AssignedOptionOutput } from "@/modules/organizations/attributes/options/outputs/assigned-options.output";
import { OptionOutput } from "@/modules/organizations/attributes/options/outputs/option.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Organizations Attributes Options Endpoints", () => {
  describe("User lacks required role", () => {
    let app: INestApplication;
    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let membershipFixtures: MembershipRepositoryFixture;

    const userEmail = `organization-attributes-options-member-${randomString()}@api.com`;
    let user: User;
    let org: Team;
    let membership: Membership;
    let attributeId: string;

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

      org = await organizationsRepositoryFixture.create({
        name: `organization-attributes-options-organization-${randomString()}`,
        isOrganization: true,
      });

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        organization: { connect: { id: org.id } },
      });

      membership = await membershipFixtures.addUserToOrg(user, org, "MEMBER", true);

      // Create an attribute for testing
      attributeId = "test-attribute-id";

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should not be able to create attribute option", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/attributes/${attributeId}/options`)
        .send({
          name: "Option 1",
          value: "option1",
        })
        .expect(403);
    });

    it("should not be able to delete attribute option", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/attributes/${attributeId}/options/1`)
        .expect(403);
    });

    afterAll(async () => {
      await membershipFixtures.delete(membership.id);
      await userRepositoryFixture.deleteByEmail(user.email);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });

  describe("User has required role", () => {
    let app: INestApplication;
    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let teamsRepositoryFixtures: TeamRepositoryFixture;

    let membershipFixtures: MembershipRepositoryFixture;
    let attributeRepositoryFixture: AttributeRepositoryFixture;

    const userEmail = `organization-attributes-options-admin-${randomString()}@api.com`;
    const userEmail2 = `organization-attributes-options-member-${randomString()}@api.com`;

    let user: User;
    let user2: User;
    let org: Team;
    let team: Team;
    let membership: Membership;
    let membership2: Membership;

    let attributeId: string;
    let attributeSlug: string;

    let createdOption: any;
    let createdOption2: any;
    let attribute2: Attribute;
    let attribute2Option: AttributeOption;

    const createOptionInput: CreateOrganizationAttributeOptionInput = {
      value: "option1",
      slug: `option1-${randomString()}`,
    };

    const createOption2Input: CreateOrganizationAttributeOptionInput = {
      value: "option2",
      slug: `option2${randomString()}`,
    };

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      teamsRepositoryFixtures = new TeamRepositoryFixture(moduleRef);
      membershipFixtures = new MembershipRepositoryFixture(moduleRef);
      attributeRepositoryFixture = new AttributeRepositoryFixture(moduleRef);

      org = await organizationsRepositoryFixture.create({
        name: `organization-attributes-options-admin-organization-${randomString()}`,
        isOrganization: true,
      });

      team = await teamsRepositoryFixtures.create({ name: "org team", parent: { connect: { id: org.id } } });

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        organization: { connect: { id: org.id } },
      });

      user2 = await userRepositoryFixture.create({
        email: userEmail2,
        username: userEmail2,
        organization: { connect: { id: org.id } },
      });

      membership = await membershipFixtures.addUserToOrg(user, org, "ADMIN", true);
      membership2 = await membershipFixtures.addUserToOrg(user2, org, "ADMIN", true);
      await membershipFixtures.create({
        role: "MEMBER",
        accepted: true,
        team: { connect: { id: team.id } },
        user: { connect: { id: user.id } },
      });

      // Create an attribute for testing
      const attribute = await attributeRepositoryFixture.create({
        name: "Test Attribute",
        team: { connect: { id: org.id } },
        type: "TEXT",
        slug: `test-attribute-${randomString()}`,
      });

      attribute2 = await attributeRepositoryFixture.create({
        name: "Test Attribute 2",
        team: { connect: { id: org.id } },
        type: "TEXT",
        slug: `test-attribute-2-${randomString()}`,
      });
      attributeId = attribute.id;
      attributeSlug = attribute.slug;
      attribute2Option = await attributeRepositoryFixture.createOption({
        slug: `optionA-${randomString()}`,
        value: "optionA",
        attribute: { connect: { id: attribute2.id } },
      });
      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should create attribute option", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/attributes/${attributeId}/options`)
        .send(createOptionInput)
        .expect(201)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          createdOption = response.body.data;
          expect(createdOption.value).toEqual(createOptionInput.value);
          expect(createdOption.slug).toEqual(createOptionInput.slug);
        });
    });

    it("should create attribute option", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/attributes/${attributeId}/options`)
        .send(createOption2Input)
        .expect(201)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          createdOption2 = response.body.data;
          expect(createdOption2.value).toEqual(createOption2Input.value);
          expect(createdOption2.slug).toEqual(createOption2Input.slug);
        });
    });

    it("should get attribute options", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/attributes/${attributeId}/options`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          const options = response.body.data as OptionOutput[];
          expect(options.length).toEqual(2);
          expect(options.find((opt) => opt.value === createOptionInput.value)).toBeDefined();
          expect(options.find((opt) => opt.slug === createOptionInput.slug)).toBeDefined();
          expect(options.find((opt) => opt.value === createOption2Input.value)).toBeDefined();
          expect(options.find((opt) => opt.slug === createOption2Input.slug)).toBeDefined();
        });
    });

    it("should update attribute option", async () => {
      const updateOptionInput: UpdateOrganizationAttributeOptionInput = {
        value: "updated-option-value",
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/attributes/${attributeId}/options/${createdOption.id}`)
        .send(updateOptionInput)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          const updatedOption = response.body.data;
          expect(updatedOption.value).toEqual(updateOptionInput.value);
        });
    });

    it("should assign attribute option to user", async () => {
      const assignInput: AssignOrganizationAttributeOptionToUserInput = {
        attributeId: attributeId,
        attributeOptionId: createdOption.id,
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/attributes/options/${user.id}`)
        .send(assignInput)
        .expect(201)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          expect(response.body.data).toBeTruthy();
        });
    });

    it("should assign attribute option to user2", async () => {
      const assignInput: AssignOrganizationAttributeOptionToUserInput = {
        attributeId: attributeId,
        attributeOptionId: createdOption2.id,
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/attributes/options/${user2.id}`)
        .send(assignInput)
        .expect(201)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          expect(response.body.data).toBeTruthy();
        });
    });

    it("should assign attribute option to user2", async () => {
      const assignInput: AssignOrganizationAttributeOptionToUserInput = {
        attributeId: attribute2.id,
        attributeOptionId: attribute2Option.id,
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/attributes/options/${user2.id}`)
        .send(assignInput)
        .expect(201)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          expect(response.body.data).toBeTruthy();
        });
    });

    it("should get attribute options for user", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/attributes/options/${user.id}`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          const userOptions = response.body.data;
          expect(userOptions.length).toEqual(1);
          expect(userOptions[0].id).toEqual(createdOption.id);
        });
    });

    it("should get attribute options for user2", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/attributes/options/${user2.id}`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          const userOptions = response.body.data as AttributeOption[];
          expect(userOptions.length).toEqual(2);
          expect(userOptions.find((opt) => opt.id === createdOption2.id)).toBeDefined();
          expect(userOptions.find((opt) => opt.id === attribute2Option.id)).toBeDefined();
        });
    });

    it("should get attribute all assigned options", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/attributes/${attributeId}/options/assigned`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          const assignedOptions = response.body.data as AssignedOptionOutput[];
          expect(assignedOptions?.length).toEqual(2);

          expect(assignedOptions.find((opt) => createdOption.id === opt.id)).toBeDefined();
          expect(
            assignedOptions
              .find((opt) => createdOption.id === opt.id)
              ?.assignedUserIds.find((id) => id === user.id)
          ).toBeDefined();

          expect(assignedOptions.find((opt) => createdOption2.id === opt.id)).toBeDefined();
          expect(
            assignedOptions
              .find((opt) => createdOption2.id === opt.id)
              ?.assignedUserIds.find((id) => id === user2.id)
          ).toBeDefined();
        });
    });

    it("should get attribute all assigned options filtered by team id", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/attributes/${attributeId}/options/assigned?teamIds=${team.id}`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          const assignedOptions = response.body.data as AssignedOptionOutput[];
          expect(assignedOptions?.length).toEqual(1);

          expect(assignedOptions.find((opt) => createdOption.id === opt.id)).toBeDefined();
          expect(
            assignedOptions
              .find((opt) => createdOption.id === opt.id)
              ?.assignedUserIds.find((id) => id === user.id)
          ).toBeDefined();
        });
    });

    it("should get attribute all assigned options by attribute slug", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/attributes/slugs/${attributeSlug}/options/assigned`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          const assignedOptions = response.body.data as AssignedOptionOutput[];
          expect(assignedOptions?.length).toEqual(2);

          expect(assignedOptions.find((opt) => createdOption.id === opt.id)).toBeDefined();
          expect(
            assignedOptions
              .find((opt) => createdOption.id === opt.id)
              ?.assignedUserIds.find((id) => id === user.id)
          ).toBeDefined();

          expect(assignedOptions.find((opt) => createdOption2.id === opt.id)).toBeDefined();
          expect(
            assignedOptions
              .find((opt) => createdOption2.id === opt.id)
              ?.assignedUserIds.find((id) => id === user2.id)
          ).toBeDefined();
        });
    });

    it("should get attribute all assigned options filtered by other assigned options", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/organizations/${org.id}/attributes/${attributeId}/options/assigned?assignedOptionIds=${attribute2Option.id}`
        )
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          const assignedOptions = response.body.data as AssignedOptionOutput[];
          expect(assignedOptions?.length).toEqual(1);
          expect(assignedOptions.find((opt) => createdOption2.id === opt.id)).toBeDefined();
          expect(
            assignedOptions
              .find((opt) => createdOption2.id === opt.id)
              ?.assignedUserIds.find((id) => id === user2.id)
          ).toBeDefined();
        });
    });

    it("should not get attribute all assigned options filtered by other assigned options and teamIds in which the user is not part of", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/organizations/${org.id}/attributes/${attributeId}/options/assigned?assignedOptionIds=${attribute2Option.id}&teamIds=${team.id}`
        )
        .expect(404);
    });

    it("should get attribute all assigned options filtered by other assigned options and teamIds", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/organizations/${org.id}/attributes/${attributeId}/options/assigned?assignedOptionIds=${createdOption.id}&teamIds=${team.id}`
        )
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          const assignedOptions = response.body.data as AssignedOptionOutput[];
          expect(assignedOptions?.length).toEqual(1);
          expect(assignedOptions.find((opt) => createdOption.id === opt.id)).toBeDefined();
          expect(
            assignedOptions
              .find((opt) => createdOption.id === opt.id)
              ?.assignedUserIds.find((id) => id === user.id)
          ).toBeDefined();
        });
    });

    it("should unassign attribute option from user", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/attributes/options/${user.id}/${createdOption.id}`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          expect(response.body.data).toBeTruthy();
        });
    });

    it("should delete attribute option", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/attributes/${attributeId}/options/${createdOption.id}`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          expect(response.body.data).toBeTruthy();
        });
    });

    afterAll(async () => {
      await membershipFixtures.delete(membership.id);
      await membershipFixtures.delete(membership2.id);
      await userRepositoryFixture.deleteByEmail(user.email);
      await userRepositoryFixture.deleteByEmail(user2.email);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});
