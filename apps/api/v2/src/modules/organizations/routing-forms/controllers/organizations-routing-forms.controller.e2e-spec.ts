import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { ApiKeyGuard } from "@/modules/auth/guards/api-key/api-key.guard";
import { ApiKeyStrategy } from "@/modules/auth/strategies/api-key.strategy";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { OrganizationsRoutingFormsModule } from "@/modules/organizations/routing-forms/organizations-routing-forms.module";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiKeyPermission } from "@calcom/prisma/enums";

import { GetRoutingFormsOutput } from "../outputs/get-routing-forms.output";

describe("OrganizationsRoutingFormsController", () => {
  let app: INestApplication;
  let prismaReadService: PrismaReadService;
  let prismaWriteService: PrismaWriteService;
  let org: any;
  let orgTeam: any;
  let apiKeyString: string;
  let routingForm: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, OrganizationsModule, OrganizationsRoutingFormsModule],
      providers: [ApiKeyStrategy, ApiKeyGuard],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning();
    await app.init();

    prismaReadService = moduleRef.get<PrismaReadService>(PrismaReadService);
    prismaWriteService = moduleRef.get<PrismaWriteService>(PrismaWriteService);

    org = await prismaWriteService.prisma.team.create({
      data: {
        name: "Test Organization",
        slug: "test-organization",
        metadata: {
          isOrganization: true,
        },
      },
    });

    orgTeam = await prismaWriteService.prisma.team.create({
      data: {
        name: "Test Team",
        slug: "test-team",
        parentId: org.id,
      },
    });

    const apiKey = await prismaWriteService.prisma.apiKey.create({
      data: {
        note: "Test API Key",
        teamId: org.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
        permissions: [ApiKeyPermission.READ_BOOKING, ApiKeyPermission.READ_FORMS],
      },
    });
    apiKeyString = apiKey.key;

    routingForm = await prismaWriteService.prisma.app_RoutingForms_Form.create({
      data: {
        name: "Test Routing Form",
        description: "Test Description",
        disabled: false,
        routes: JSON.stringify([]),
        fields: JSON.stringify([]),
        settings: JSON.stringify({}),
        teamId: org.id,
      },
    });
  });

  afterAll(async () => {
    await prismaWriteService.prisma.app_RoutingForms_Form.deleteMany({
      where: {
        teamId: org.id,
      },
    });
    await prismaWriteService.prisma.apiKey.deleteMany({
      where: {
        teamId: org.id,
      },
    });
    await prismaWriteService.prisma.team.delete({
      where: {
        id: orgTeam.id,
      },
    });
    await prismaWriteService.prisma.team.delete({
      where: {
        id: org.id,
      },
    });
    await app.close();
  });

  describe(`GET /v2/organizations/:orgId/routing-forms`, () => {
    it("should not get routing forms for non existing org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/99999/routing-forms`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(404);
    });

    it("should not get routing forms without authentication", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/${org.id}/routing-forms`).expect(401);
    });

    it("should get organization routing forms", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/routing-forms`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          const responseBody: GetRoutingFormsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const routingForms = responseBody.data;
          expect(routingForms).toBeDefined();
          expect(routingForms.length).toBeGreaterThan(0);
          expect(routingForms[0].id).toEqual(routingForm.id);
          expect(routingForms[0].name).toEqual(routingForm.name);
          expect(routingForms[0].description).toEqual(routingForm.description);
          expect(routingForms[0].disabled).toEqual(routingForm.disabled);
        });
    });

    it("should filter routing forms by name", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/routing-forms?name=Test`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          const responseBody: GetRoutingFormsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const routingForms = responseBody.data;
          expect(routingForms).toBeDefined();
          expect(routingForms.length).toBeGreaterThan(0);
          expect(routingForms[0].name).toContain("Test");
        });
    });

    it("should filter routing forms by disabled status", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/routing-forms?disabled=false`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          const responseBody: GetRoutingFormsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const routingForms = responseBody.data;
          expect(routingForms).toBeDefined();
          expect(routingForms.length).toBeGreaterThan(0);
          expect(routingForms[0].disabled).toEqual(false);
        });
    });
  });
});
