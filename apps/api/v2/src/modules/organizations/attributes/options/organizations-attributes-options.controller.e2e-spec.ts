import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

import { AppModule } from "../../../../app.module";

describe("OrganizationsAttributesOptionsController (e2e)", () => {
  let app: INestApplication;
  let prismaRead: PrismaReadService;
  let prismaWrite: PrismaWriteService;
  let organization: any;
  let team: any;
  let attribute: any;
  let attributeOption: any;
  let user: any;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaRead = moduleFixture.get<PrismaReadService>(PrismaReadService);
    prismaWrite = moduleFixture.get<PrismaWriteService>(PrismaWriteService);

    await app.init();

    const organizationSlug = `org-${uuidv4()}`;
    organization = await prismaWrite.prisma.team.create({
      data: {
        name: "Test Organization",
        slug: organizationSlug,
        metadata: {
          isOrganization: true,
        },
      },
    });

    team = await prismaWrite.prisma.team.create({
      data: {
        name: "Test Team",
        slug: `team-${uuidv4()}`,
        parentId: organization.id,
      },
    });

    user = await prismaWrite.prisma.user.create({
      data: {
        username: `user-${uuidv4()}`,
        email: `user-${uuidv4()}@example.com`,
        emailVerified: new Date(),
        profiles: {
          create: {
            organizationId: organization.id,
          } as any,
        },
        teams: {
          create: {
            teamId: team.id,
            accepted: true,
            role: "MEMBER",
          },
        },
      },
      include: {
        teams: true,
      },
    });

    attribute = await prismaWrite.prisma.attribute.create({
      data: {
        name: "Test Attribute",
        slug: "test-attribute",
        teamId: team.id,
      } as any,
    });

    attributeOption = await prismaWrite.prisma.attributeOption.create({
      data: {
        value: "Test Option",
        attributeId: attribute.id,
      } as any,
    });

    await prismaWrite.prisma.attributeToUser.create({
      data: {
        attributeOptionId: attributeOption.id,
        memberId: user.teams[0].id,
      } as any,
    });
  });

  afterEach(async () => {
    await prismaWrite.prisma.attributeToUser.deleteMany({});
    await prismaWrite.prisma.attributeOption.deleteMany({});
    await prismaWrite.prisma.attribute.deleteMany({});
    await prismaWrite.prisma.membership.deleteMany({});
    await prismaWrite.prisma.profile.deleteMany({});
    await prismaWrite.prisma.user.deleteMany({});
    await prismaWrite.prisma.team.deleteMany({});
    await app.close();
  });

  describe("/v2/organizations/:orgId/teams/:teamId/attributes/:attributeSlug/options/assigned (GET)", () => {
    it("should return assigned options for an attribute", async () => {
      return request(app)
        .get(
          `/v2/organizations/${organization.id}/teams/${team.id}/attributes/${attribute.slug}/options/assigned`
        )
        .set("x-cal-api-key", "test-api-key")
        .expect(200)
        .then((response: any) => {
          expect(response.body.status).toBe(SUCCESS_STATUS);
          expect(response.body.data).toBeInstanceOf(Array);
          expect(response.body.data.length).toBeGreaterThan(0);

          const option = response.body.data[0];
          expect(option).toHaveProperty("optionId");
          expect(option).toHaveProperty("optionValue");
          expect(option).toHaveProperty("userIds");
          expect(option.userIds).toBeInstanceOf(Array);
        });
    });

    it("should filter assigned options based on other assigned options", async () => {
      const additionalAttribute = await prismaWrite.prisma.attribute.create({
        data: {
          name: "Additional Attribute",
          slug: "additional-attribute",
          teamId: team.id,
        } as any,
      });

      const additionalOption = await prismaWrite.prisma.attributeOption.create({
        data: {
          value: "Additional Option",
          attributeId: additionalAttribute.id,
        } as any,
      });

      await prismaWrite.prisma.attributeToUser.create({
        data: {
          attributeOptionId: additionalOption.id,
          memberId: user.teams[0].id,
        },
      });

      return request(app)
        .get(
          `/v2/organizations/${organization.id}/teams/${team.id}/attributes/${attribute.slug}/options/assigned?assignedOptionIds=${additionalOption.id}`
        )
        .set("x-cal-api-key", "test-api-key")
        .expect(200)
        .then((response: any) => {
          expect(response.body.status).toBe(SUCCESS_STATUS);
          expect(response.body.data).toBeInstanceOf(Array);
          expect(response.body.data.length).toBeGreaterThan(0);

          const option = response.body.data[0];
          expect(option.optionId).toBe(attributeOption.id);
          expect(option.userIds).toContain(user.id);
        });
    });
  });

  describe("/v2/organizations/:orgId/teams/:teamId/users (GET)", () => {
    it("should return users filtered by attribute options with OR operator", async () => {
      return request(app)
        .get(
          `/v2/organizations/${organization.id}/teams/${team.id}/users?attributeOptionIds=${attributeOption.id}`
        )
        .set("x-cal-api-key", "test-api-key")
        .expect(200)
        .then((response: any) => {
          expect(response.body.status).toBe(SUCCESS_STATUS);
          expect(response.body.data).toBeInstanceOf(Array);
          expect(response.body.data.length).toBeGreaterThan(0);

          const foundUser = response.body.data.find((u: any) => u.userId === user.id);
          expect(foundUser).toBeDefined();
          expect(foundUser.username).toBe(user.username);
        });
    });

    it("should return users filtered by attribute options with AND operator", async () => {
      const additionalAttribute = await prismaWrite.prisma.attribute.create({
        data: {
          name: "Additional Attribute",
          slug: "additional-attribute",
          teamId: team.id,
        } as any,
      });

      const additionalOption = await prismaWrite.prisma.attributeOption.create({
        data: {
          value: "Additional Option",
          attributeId: additionalAttribute.id,
        } as any,
      });

      await prismaWrite.prisma.attributeToUser.create({
        data: {
          attributeOptionId: additionalOption.id,
          memberId: user.teams[0].id,
        },
      });

      return request(app)
        .get(
          `/v2/organizations/${organization.id}/teams/${team.id}/users?attributeOptionIds=${attributeOption.id}&attributeOptionIds=${additionalOption.id}&attributeQueryOperator=AND`
        )
        .set("x-cal-api-key", "test-api-key")
        .expect(200)
        .then((response: any) => {
          expect(response.body.status).toBe(SUCCESS_STATUS);
          expect(response.body.data).toBeInstanceOf(Array);
          expect(response.body.data.length).toBeGreaterThan(0);

          const foundUser = response.body.data.find((u: any) => u.userId === user.id);
          expect(foundUser).toBeDefined();
          expect(foundUser.username).toBe(user.username);
        });
    });

    it("should return users filtered by attribute options with NONE operator", async () => {
      const anotherUser = await prismaWrite.prisma.user.create({
        data: {
          username: `user-${uuidv4()}`,
          email: `user-${uuidv4()}@example.com`,
          emailVerified: new Date(),
          teams: {
            create: {
              teamId: team.id,
              accepted: true,
              role: "MEMBER",
            },
          },
        },
      });

      return request(app)
        .get(
          `/v2/organizations/${organization.id}/teams/${team.id}/users?attributeOptionIds=${attributeOption.id}&attributeQueryOperator=NONE`
        )
        .set("x-cal-api-key", "test-api-key")
        .expect(200)
        .then((response: any) => {
          expect(response.body.status).toBe(SUCCESS_STATUS);
          expect(response.body.data).toBeInstanceOf(Array);

          const foundUser = response.body.data.find((u: any) => u.userId === user.id);
          expect(foundUser).toBeUndefined();

          const foundAnotherUser = response.body.data.find((u: any) => u.userId === anotherUser.id);
          expect(foundAnotherUser).toBeDefined();
        });
    });
  });
});
