import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateOrganizationAttributeInput } from "@/modules/organizations/inputs/attributes/create-organization-attribute.input";
import { UpdateOrganizationAttributeInput } from "@/modules/organizations/inputs/attributes/update-organization-attribute.input";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { User, Team, Membership } from "@calcom/prisma/client";

describe("Organizations Attributes Endpoints", () => {
  describe("User lacks required role", () => {
    let app: INestApplication;
    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let membershipFixtures: MembershipRepositoryFixture;

    const userEmail = "member@attributes-api.com";
    let user: User;
    let org: Team;
    let membership: Membership;

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
        name: "AttributesCorp",
        isOrganization: true,
      });

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        organization: { connect: { id: org.id } },
      });

      membership = await membershipFixtures.addUserToOrg(user, org, "MEMBER", true);

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should not be able to create attribute for org", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/attributes`)
        .send({
          key: "department",
          value: "engineering",
        })
        .expect(403);
    });

    it("should not be able to delete attribute for org", async () => {
      return request(app.getHttpServer()).delete(`/v2/organizations/${org.id}/attributes/1`).expect(403);
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

    const userEmail = "admin@attributes-api.com";
    let user: User;
    let org: Team;
    let membership: Membership;

    let createdAttribute: any;

    const createAttributeInput: CreateOrganizationAttributeInput = {
      name: "department",
      slug: "department",
      type: "TEXT",
      options: [],
      enabled: true,
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

      org = await organizationsRepositoryFixture.create({
        name: "AttributesCorp",
        isOrganization: true,
      });

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        organization: { connect: { id: org.id } },
      });

      membership = await membershipFixtures.addUserToOrg(user, org, "ADMIN", true);

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should create attribute for org", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/attributes`)
        .send(createAttributeInput)
        .expect(201)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          createdAttribute = response.body.data;
          expect(createdAttribute.type).toEqual(createAttributeInput.type);
          expect(createdAttribute.slug).toEqual(createAttributeInput.slug);
          expect(createdAttribute.enabled).toEqual(createAttributeInput.enabled);
        });
    });

    it("should get org attributes", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/attributes`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          const attributes = response.body.data;
          expect(attributes.length).toEqual(1);
          expect(attributes[0].name).toEqual(createAttributeInput.name);
          expect(attributes[0].slug).toEqual(createAttributeInput.slug);
          expect(attributes[0].type).toEqual(createAttributeInput.type);
          expect(attributes[0].enabled).toEqual(createAttributeInput.enabled);
        });
    });

    it("should get single org attribute", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/attributes/${createdAttribute.id}`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          const attribute = response.body.data;
          expect(attribute.name).toEqual(createAttributeInput.name);
          expect(attribute.slug).toEqual(createAttributeInput.slug);
          expect(attribute.type).toEqual(createAttributeInput.type);
          expect(attribute.enabled).toEqual(createAttributeInput.enabled);
        });
    });

    it("should update org attribute", async () => {
      const updateAttributeInput: UpdateOrganizationAttributeInput = {
        name: "marketing",
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/attributes/${createdAttribute.id}`)
        .send(updateAttributeInput)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          const updatedAttribute = response.body.data;
          expect(updatedAttribute.name).toEqual(updateAttributeInput.name);
        });
    });

    it("should delete org attribute", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/attributes/${createdAttribute.id}`)
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
