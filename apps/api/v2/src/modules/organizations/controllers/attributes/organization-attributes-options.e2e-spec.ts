import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { AssignOrganizationAttributeOptionToUserInput } from "@/modules/organizations/inputs/attributes/assign/organizations-attributes-options-assign.input";
import { CreateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/create-organization-attribute-option.input";
import { UpdateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/update-organizaiton-attribute-option.input.ts";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { AttributeRepositoryFixture } from "test/fixtures/repository/attributes.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { User, Team, Membership } from "@calcom/prisma/client";

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
    let membershipFixtures: MembershipRepositoryFixture;
    let attributeRepositoryFixture: AttributeRepositoryFixture;

    const userEmail = `organization-attributes-options-admin-${randomString()}@api.com`;
    let user: User;
    let org: Team;
    let membership: Membership;
    let attributeId: string;
    let createdOption: any;

    const createOptionInput: CreateOrganizationAttributeOptionInput = {
      value: "option1",
      slug: "option1",
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
      membershipFixtures = new MembershipRepositoryFixture(moduleRef);
      attributeRepositoryFixture = new AttributeRepositoryFixture(moduleRef);

      org = await organizationsRepositoryFixture.create({
        name: `organization-attributes-options-admin-organization-${randomString()}`,
        isOrganization: true,
      });

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        organization: { connect: { id: org.id } },
      });

      membership = await membershipFixtures.addUserToOrg(user, org, "ADMIN", true);

      // Create an attribute for testing
      const attribute = await attributeRepositoryFixture.create({
        name: "Test Attribute",
        team: { connect: { id: org.id } },
        type: "TEXT",
        slug: "test-attribute",
      });
      attributeId = attribute.id;

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

    it("should get attribute options", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/attributes/${attributeId}/options`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          const options = response.body.data;
          expect(options.length).toEqual(1);
          expect(options[0].value).toEqual(createOptionInput.value);
          expect(options[0].slug).toEqual(createOptionInput.slug);
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
      await userRepositoryFixture.deleteByEmail(user.email);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});
