import { bootstrap } from "@/app";
// Assuming this is your main app bootstrapper
import { AppModule } from "@/app.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { CreateWorkflowDto } from "@/modules/workflows/inputs/create-workflow.input";
import {
  ATTENDEE,
  REMINDER,
  PHONE_NUMBER,
  EMAIL,
  WorkflowEmailAttendeeStepDto,
} from "@/modules/workflows/inputs/workflow-step.input";
import { BEFORE_EVENT, DAY } from "@/modules/workflows/inputs/workflow-trigger.input";
// Adjust path if needed
import { GetWorkflowOutput, GetWorkflowsOutput } from "@/modules/workflows/outputs/workflow.output";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User, Team } from "@prisma/client";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { VerifiedResourcesRepositoryFixtures } from "test/fixtures/repository/verified-resources.repository.fixture";
import { WorkflowRepositoryFixture } from "test/fixtures/repository/workflow.repository.fixture";
import { randomString } from "test/utils/randomString";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

describe("OrganizationsTeamsWorkflowsController (E2E)", () => {
  let app: INestApplication;
  let verifiedResourcesRepositoryFixtures: VerifiedResourcesRepositoryFixtures;
  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let teamsRepositoryFixture: TeamRepositoryFixture;
  let profileRepositoryFixture: ProfileRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;
  let workflowsRepositoryFixture: WorkflowRepositoryFixture;
  let basePath = "";
  let org: Team;
  let orgTeam: Team;
  let createdWorkflowId: number;
  const authEmail = `org-teams-workflows-user-${randomString()}@example.com`;
  let user: User;
  let apiKeyString: string;
  let verifiedPhoneId: number;
  let verifiedEmailId: number;
  let createdWorkflow: GetWorkflowOutput["data"];

  let sampleCreateWorkflowDto: CreateWorkflowDto = {
    name: `E2E Test Workflow ${randomString()}`,
    activation: {
      isActiveOnAllEventTypes: true,
      activeOnEventTypeIds: [],
    },
    trigger: {
      type: BEFORE_EVENT,
      offset: {
        value: 1,
        unit: DAY,
      },
    },
    steps: [],
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, TokensModule],
    }).compile();

    // Instantiate Fixtures
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
    teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    workflowsRepositoryFixture = new WorkflowRepositoryFixture(moduleRef);
    verifiedResourcesRepositoryFixtures = new VerifiedResourcesRepositoryFixtures(moduleRef);

    org = await organizationsRepositoryFixture.create({
      name: `org-teams-workflows-org-${randomString()}`,
      slug: `org-teams-workflows-org-${randomString()}`,
      isOrganization: true,
      platformBilling: {
        create: {
          customerId: "cus_999",
          plan: "SCALE",
          subscriptionId: "sub_999",
        },
      },
    });

    user = await userRepositoryFixture.create({
      email: authEmail,
      username: authEmail.split("@")[0],
    });

    const apiKey = await apiKeysRepositoryFixture.createApiKey(user.id, null);
    apiKeyString = apiKey.keyString;

    orgTeam = await teamsRepositoryFixture.create({
      name: `org-teams-workflows-team-${randomString()}`,
      isOrganization: false,
      parent: { connect: { id: org.id } },
    });

    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: user.id } },
      accepted: true,
      team: { connect: { id: org.id } },
    });
    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: user.id } },
      accepted: true,
      team: { connect: { id: orgTeam.id } },
    });

    await profileRepositoryFixture.create({
      uid: `usr-${user.id}`,
      username: authEmail.split("@")[0],
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

    const verifiedPhone = await verifiedResourcesRepositoryFixtures.createPhone({
      user: { connect: { id: user.id } },
      phoneNumber: "+37255555555",
      team: { connect: { id: orgTeam.id } },
    });
    const verifiedEmail = await verifiedResourcesRepositoryFixtures.createEmail({
      user: { connect: { id: user.id } },
      email: authEmail,
      team: { connect: { id: orgTeam.id } },
    });
    verifiedEmailId = verifiedEmail.id;
    verifiedPhoneId = verifiedPhone.id;

    sampleCreateWorkflowDto = {
      name: `E2E Test Workflow ${randomString()}`,
      activation: {
        isActiveOnAllEventTypes: true,
        activeOnEventTypeIds: [],
      },
      trigger: {
        type: BEFORE_EVENT,
        offset: {
          value: 1,
          unit: DAY,
        },
      },
      steps: [
        {
          stepNumber: 1,
          action: "email_attendee",
          recipient: ATTENDEE,
          template: REMINDER,
          sender: "CalcomE2EStep1",
          includeCalendarEvent: true,
          message: {
            subject: "Upcoming: {EVENT_NAME}",
            html: "<p>Reminder for your event {EVENT_NAME}.</p>",
          },
        },
        {
          stepNumber: 2,
          action: "sms_number",
          recipient: PHONE_NUMBER,
          template: REMINDER,
          verifiedPhoneId: verifiedPhoneId,
          sender: "CalcomE2EStep2",
          message: {
            subject: "Upcoming: {EVENT_NAME}",
            text: "Reminder for your event {EVENT_NAME}.",
          },
        },
        {
          stepNumber: 3,
          action: "email_address",
          recipient: EMAIL,
          template: REMINDER,
          verifiedEmailId: verifiedEmailId,
          sender: "CalcomE2EStep3",
          includeCalendarEvent: true,
          message: {
            subject: "Upcoming: {EVENT_NAME}",
            html: "<p>Reminder for your event {EVENT_NAME}.</p>",
          },
        },
      ],
    };
    basePath = `/v2/organizations/${org.id}/teams/${orgTeam.id}/workflows`;
    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  afterAll(async () => {
    if (createdWorkflowId) {
      try {
        await workflowsRepositoryFixture.delete(createdWorkflowId);
      } catch (error) {}
    }

    await userRepositoryFixture.deleteByEmail(user.email);
    await teamsRepositoryFixture.delete(orgTeam.id);
    await organizationsRepositoryFixture.delete(org.id);

    await app.close();
  });

  describe(`POST ${basePath}`, () => {
    it("should create a new workflow", async () => {
      return request(app.getHttpServer())
        .post(basePath)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send(sampleCreateWorkflowDto)
        .expect(201)
        .then((response) => {
          const responseBody: GetWorkflowOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.name).toEqual(sampleCreateWorkflowDto.name);
          expect(responseBody.data.activation.isActiveOnAllEventTypes).toEqual(
            sampleCreateWorkflowDto.activation.isActiveOnAllEventTypes
          );
          expect(responseBody.data.trigger.type).toEqual(sampleCreateWorkflowDto.trigger.type);
          expect(responseBody.data.steps).toHaveLength(sampleCreateWorkflowDto.steps.length);
          expect(responseBody.data.steps.find((step) => step.stepNumber === 1)?.id).toBeDefined();
          expect(responseBody.data.steps.find((step) => step.stepNumber === 2)?.id).toBeDefined();
          expect(responseBody.data.steps.find((step) => step.stepNumber === 3)?.id).toBeDefined();
          expect(responseBody.data.steps.find((step) => step.stepNumber === 1)?.sender).toEqual(
            "CalcomE2EStep1"
          );
          expect(responseBody.data.steps.find((step) => step.stepNumber === 2)?.sender).toEqual(
            "CalcomE2EStep2"
          );
          expect(responseBody.data.steps.find((step) => step.stepNumber === 2)?.phone).toEqual(
            "+37255555555"
          );
          expect(responseBody.data.steps.find((step) => step.stepNumber === 3)?.email).toEqual(authEmail);
          createdWorkflowId = responseBody.data.id;
          createdWorkflow = responseBody.data;
        });
    });

    it("should return 401 if not authenticated", async () => {
      return request(app.getHttpServer()).post(basePath).send(sampleCreateWorkflowDto).expect(401);
    });

    it("should return 400 for invalid data (e.g. missing name)", async () => {
      const invalidDto = { ...sampleCreateWorkflowDto, name: undefined };
      return request(app.getHttpServer())
        .post(basePath)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send(invalidDto)
        .expect(400);
    });
  });

  describe(`GET ${basePath}`, () => {
    it("should get a list of workflows for the team", async () => {
      return request(app.getHttpServer())
        .get(`${basePath}?skip=0&take=10`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          const responseBody: GetWorkflowsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeInstanceOf(Array);
          expect(responseBody.data.length).toBeGreaterThanOrEqual(1);
          expect(responseBody.data.some((wf) => wf.id === createdWorkflowId)).toBe(true);
        });
    });

    it("should return 401 if not authenticated", async () => {
      return request(app.getHttpServer()).get(basePath).expect(401);
    });
  });

  describe(`GET ${basePath}/:workflowId`, () => {
    it("should get a specific workflow by ID", async () => {
      expect(createdWorkflowId).toBeDefined();
      return request(app.getHttpServer())
        .get(`${basePath}/${createdWorkflowId}`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          const responseBody: GetWorkflowOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.id).toEqual(createdWorkflowId);
        });
    });

    it("should return 404 for a non-existent workflow ID", async () => {
      return request(app.getHttpServer())
        .get(`${basePath}/999999`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(404);
    });

    it("should return 401 if not authenticated", async () => {
      expect(createdWorkflowId).toBeDefined();
      return request(app.getHttpServer()).get(`${basePath}/${createdWorkflowId}`).expect(401);
    });
  });

  describe(`PATCH ${basePath}/:workflowId`, () => {
    const updatedName = `Updated Workflow Name ${randomString()}`;

    it("should update an existing workflow, update the first step and discard other steps", async () => {
      const step1 = createdWorkflow.steps.find((step) => step.stepNumber === 1);
      expect(step1).toBeDefined();
      const partialUpdateDto: Partial<CreateWorkflowDto> = {
        name: updatedName,
        steps: step1 ? [{ ...step1, sender: "updatedSender" } as WorkflowEmailAttendeeStepDto] : [],
      };
      expect(createdWorkflowId).toBeDefined();
      expect(createdWorkflow).toBeDefined();
      return request(app.getHttpServer())
        .patch(`${basePath}/${createdWorkflowId}`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send(partialUpdateDto)
        .expect(200)
        .then((response) => {
          const responseBody: GetWorkflowOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.id).toEqual(createdWorkflowId);
          expect(responseBody.data.name).toEqual(updatedName);
          step1 && expect(responseBody.data.steps[0].id).toEqual(step1.id);
          expect(responseBody.data.steps[0].sender).toEqual("updatedSender");
          expect(responseBody.data.steps[1]?.id).toBeUndefined();
        });
    });

    it("should return 404 for updating a non-existent workflow ID", async () => {
      const partialUpdateDto: Partial<CreateWorkflowDto> = {
        name: updatedName,
        steps: [{ ...createdWorkflow.steps[0], sender: "updatedSender" } as WorkflowEmailAttendeeStepDto],
      };
      return request(app.getHttpServer())
        .patch(`${basePath}/999999`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send(partialUpdateDto)
        .expect(404);
    });

    it("should return 401 if not authenticated", async () => {
      const partialUpdateDto: Partial<CreateWorkflowDto> = {
        name: updatedName,
        steps: [{ ...createdWorkflow.steps[0], sender: "updatedSender" } as WorkflowEmailAttendeeStepDto],
      };
      expect(createdWorkflowId).toBeDefined();
      return request(app.getHttpServer())
        .patch(`${basePath}/${createdWorkflowId}`)
        .send(partialUpdateDto)
        .expect(401);
    });
  });

  describe(`DELETE ${basePath}/:workflowId`, () => {
    let workflowToDeleteId: number;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post(basePath)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ ...sampleCreateWorkflowDto, name: `Workflow To Delete ${randomString()}` });
      workflowToDeleteId = res.body.data.id;
    });

    it("should delete an existing workflow", async () => {
      return request(app.getHttpServer())
        .delete(`${basePath}/${workflowToDeleteId}`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
        });
    });

    it("should return 404 when trying to delete a non-existent workflow ID", async () => {
      return request(app.getHttpServer())
        .delete(`${basePath}/999999`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(404);
    });

    it("should return 401 if not authenticated", async () => {
      return request(app.getHttpServer()).delete(`${basePath}/${workflowToDeleteId}`).expect(401);
    });
  });
});
