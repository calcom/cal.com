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

describe("OrganizationsRoutingFormsResponsesController", () => {
  let app: INestApplication;
  let prismaReadService: PrismaReadService;
  let prismaWriteService: PrismaWriteService;
  let org: any;
  let apiKeyString: string;
  let routingForm: any;
  let routingFormResponse: any;

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

    routingFormResponse = await prismaWriteService.prisma.app_RoutingForms_FormResponse.create({
      data: {
        formId: routingForm.id,
        response: JSON.stringify({ question1: "answer1", question2: "answer2" }),
      },
    });
  });

  afterAll(async () => {
    await prismaWriteService.prisma.app_RoutingForms_FormResponse.deleteMany({
      where: {
        formId: routingForm.id,
      },
    });
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
        id: org.id,
      },
    });
    await app.close();
  });

  describe(`GET /v2/organizations/:orgId/routing-forms/:routingFormId/responses`, () => {
    it("should not get routing form responses for non existing org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/99999/routing-forms/${routingForm.id}/responses`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(404);
    });

    it("should not get routing form responses for non existing form", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/routing-forms/non-existent-id/responses`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(404);
    });

    it("should not get routing form responses without authentication", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses`)
        .expect(401);
    });

    it("should get routing form responses", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const responses = responseBody.data;
          expect(responses).toBeDefined();
          expect(responses.length).toBeGreaterThan(0);
          expect(responses[0].id).toEqual(routingFormResponse.id);
          expect(responses[0].formId).toEqual(routingFormResponse.formId);
        });
    });
  });

  describe(`PATCH /v2/organizations/:orgId/routing-forms/:routingFormId/responses/:responseId`, () => {
    it("should not update routing form response for non existing org", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/99999/routing-forms/${routingForm.id}/responses/${routingFormResponse.id}`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(404);
    });

    it("should not update routing form response for non existing form", async () => {
      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/${org.id}/routing-forms/non-existent-id/responses/${routingFormResponse.id}`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(404);
    });

    it("should not update routing form response for non existing response", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses/99999`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(404);
    });

    it("should not update routing form response without authentication", async () => {
      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses/${routingFormResponse.id}`
        )
        .send({ response: JSON.stringify({ question1: "updated_answer1" }) })
        .expect(401);
    });

    it("should update routing form response", async () => {
      const updatedResponse = JSON.stringify({ question1: "updated_answer1", question2: "updated_answer2" });
      return request(app.getHttpServer())
        .patch(
          `/v2/organizations/${org.id}/routing-forms/${routingForm.id}/responses/${routingFormResponse.id}`
        )
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ response: updatedResponse })
        .expect(200)
        .then((response) => {
          const responseBody = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data;
          expect(data).toBeDefined();
          expect(data.id).toEqual(routingFormResponse.id);
          expect(data.formId).toEqual(routingFormResponse.formId);
          expect(data.response).toEqual(updatedResponse);
        });
    });
  });
});
