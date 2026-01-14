import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { VerifiedResourcesRepositoryFixtures } from "test/fixtures/repository/verified-resources.repository.fixture";
import { WorkflowRepositoryFixture } from "test/fixtures/repository/workflow.repository.fixture";
import { randomString } from "test/utils/randomString";
// Assuming this is your main app bootstrapper
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import {
  CreateEventTypeWorkflowDto,
  WorkflowActivationDto,
} from "@/modules/workflows/inputs/create-event-type-workflow.input";
import {
  CreateFormWorkflowDto,
  WorkflowFormActivationDto,
} from "@/modules/workflows/inputs/create-form-workflow";
import {
  ATTENDEE,
  EMAIL,
  PHONE_NUMBER,
  REMINDER,
  UpdateEmailAddressWorkflowStepDto,
  UpdatePhoneWhatsAppNumberWorkflowStepDto,
  WorkflowEmailAddressStepDto,
  WorkflowEmailAttendeeStepDto,
} from "@/modules/workflows/inputs/workflow-step.input";
import {
  AFTER_EVENT,
  BEFORE_EVENT,
  DAY,
  FORM_SUBMITTED,
  FORM_SUBMITTED_NO_EVENT,
  OnAfterEventTriggerDto,
  OnBeforeEventTriggerDto,
  OnFormSubmittedNoEventTriggerDto,
  OnFormSubmittedTriggerDto,
} from "@/modules/workflows/inputs/workflow-trigger.input";
import {
  GetEventTypeWorkflowOutput,
  GetEventTypeWorkflowsOutput,
} from "@/modules/workflows/outputs/event-type-workflow.output";
// Adjust path if needed
import {
  GetRoutingFormWorkflowOutput,
  GetRoutingFormWorkflowsOutput,
} from "@/modules/workflows/outputs/routing-form-workflow.output";

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
  let createdFormWorkflowId: number;
  const authEmail = `org-teams-workflows-user-${randomString()}@example.com`;
  let user: User;
  let apiKeyString: string;
  let verifiedPhoneId: number;
  let verifiedPhoneId2: number;
  let verifiedEmailId: number;
  let verifiedEmailId2: number;
  let createdWorkflow: GetEventTypeWorkflowOutput["data"];
  let createdFormWorkflow: GetRoutingFormWorkflowOutput["data"];

  const emailToVerify = `org-teams-workflows-team-${randomString()}@example.com`;
  const phoneToVerify = `+37255556666`;

  let sampleCreateEventTypeWorkflowDto = {
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
  } as unknown as CreateEventTypeWorkflowDto;

  let sampleCreateWorkflowRoutingFormDto: CreateFormWorkflowDto = {
    name: `E2E Test Workflow ${randomString()}`,
    activation: {
      activeOnRoutingFormIds: [],
      isActiveOnAllRoutingForms: true,
    },
    trigger: {
      type: FORM_SUBMITTED,
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
    const verifiedPhone2 = await verifiedResourcesRepositoryFixtures.createPhone({
      user: { connect: { id: user.id } },
      phoneNumber: phoneToVerify,
      team: { connect: { id: orgTeam.id } },
    });
    const verifiedEmail = await verifiedResourcesRepositoryFixtures.createEmail({
      user: { connect: { id: user.id } },
      email: authEmail,
      team: { connect: { id: orgTeam.id } },
    });

    const verifiedEmail2 = await verifiedResourcesRepositoryFixtures.createEmail({
      user: { connect: { id: user.id } },
      email: emailToVerify,
      team: { connect: { id: orgTeam.id } },
    });
    verifiedEmailId = verifiedEmail.id;
    verifiedEmailId2 = verifiedEmail2.id;

    verifiedPhoneId = verifiedPhone.id;
    verifiedPhoneId2 = verifiedPhone2.id;

    sampleCreateEventTypeWorkflowDto = {
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
        {
          stepNumber: 4,
          action: "sms_attendee",
          recipient: PHONE_NUMBER,
          template: REMINDER,
          phoneRequired: true,
          sender: "CalcomE2EStep4",
          message: {
            subject: "Upcoming: {EVENT_NAME}",
            text: "Reminder for your event {EVENT_NAME}.",
          },
        },
      ],
    };

    sampleCreateWorkflowRoutingFormDto = {
      name: `E2E Test Form Workflow ${randomString()}`,
      activation: {
        isActiveOnAllRoutingForms: true,
        activeOnRoutingFormIds: [],
      },
      trigger: {
        type: FORM_SUBMITTED,
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
      } catch {
        /* empty */
      }
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
        .send(sampleCreateEventTypeWorkflowDto)
        .expect(201)
        .then((response) => {
          const responseBody: GetEventTypeWorkflowOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.activation).toBeDefined();

          expect(responseBody.data.name).toEqual(sampleCreateEventTypeWorkflowDto.name);
          if (responseBody.data.activation instanceof WorkflowActivationDto) {
            expect(responseBody.data.activation.isActiveOnAllEventTypes).toEqual(
              sampleCreateEventTypeWorkflowDto.activation.isActiveOnAllEventTypes
            );
          }
          if (
            responseBody.data.activation instanceof WorkflowFormActivationDto &&
            sampleCreateEventTypeWorkflowDto.activation instanceof WorkflowFormActivationDto
          ) {
            expect(responseBody.data.activation.isActiveOnAllRoutingForms).toEqual(
              sampleCreateEventTypeWorkflowDto.activation.isActiveOnAllRoutingForms
            );
          }

          expect(responseBody.data.trigger.type).toEqual(sampleCreateEventTypeWorkflowDto.trigger.type);
          expect(responseBody.data.steps).toHaveLength(sampleCreateEventTypeWorkflowDto.steps.length);
          expect(responseBody.data.steps.find((step) => step.stepNumber === 1)?.id).toBeDefined();
          expect(responseBody.data.steps.find((step) => step.stepNumber === 2)?.id).toBeDefined();
          expect(responseBody.data.steps.find((step) => step.stepNumber === 3)?.id).toBeDefined();
          expect(responseBody.data.steps.find((step) => step.stepNumber === 4)?.id).toBeDefined();

          expect(responseBody.data.steps.find((step) => step.stepNumber === 1)?.sender).toEqual(
            "CalcomE2EStep1"
          );
          expect(responseBody.data.steps.find((step) => step.stepNumber === 1)?.includeCalendarEvent).toEqual(
            true
          );
          expect(responseBody.data.steps.find((step) => step.stepNumber === 2)?.sender).toEqual(
            "CalcomE2EStep2"
          );
          expect(responseBody.data.steps.find((step) => step.stepNumber === 2)?.phone).toEqual(
            "+37255555555"
          );
          expect(responseBody.data.steps.find((step) => step.stepNumber === 4)?.phoneRequired).toEqual(true);

          expect(responseBody.data.steps.find((step) => step.stepNumber === 3)?.email).toEqual(authEmail);
          const trigger = sampleCreateEventTypeWorkflowDto.trigger as OnBeforeEventTriggerDto;
          expect(responseBody.data.trigger?.offset?.value).toEqual(trigger.offset.value);
          expect(responseBody.data.trigger?.offset?.unit).toEqual(trigger.offset.unit);

          createdWorkflowId = responseBody.data.id;
          createdWorkflow = responseBody.data;
          expect(responseBody.data.type).toEqual("event-type");
        });
    });

    it("should not create a new routing form workflow with trigger not FORM_SUBMITTED", async () => {
      const invalidWorkflow = structuredClone(
        sampleCreateWorkflowRoutingFormDto
      ) as unknown as CreateEventTypeWorkflowDto;
      invalidWorkflow.trigger.type = AFTER_EVENT;
      return request(app.getHttpServer())
        .post(`${basePath}/routing-form`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send(invalidWorkflow)
        .expect(400);
    });

    it("should not create a new routing form workflow with not allowed actions", async () => {
      // force impossible step to test validation, should fail with 400
      const invalidWorkflow = structuredClone(
        sampleCreateWorkflowRoutingFormDto
      ) as unknown as CreateEventTypeWorkflowDto;
      invalidWorkflow.steps = [
        {
          stepNumber: 1,
          action: "cal_ai_phone_call",
          recipient: PHONE_NUMBER,
          template: REMINDER,
          verifiedPhoneId: verifiedPhoneId,
          sender: "CalcomE2EStep2",
          message: {
            subject: "Upcoming: {EVENT_NAME}",
            text: "Reminder for your event {EVENT_NAME}.",
          },
        } as unknown as WorkflowEmailAddressStepDto,
      ];
      return request(app.getHttpServer())
        .post(`${basePath}/routing-form`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send(invalidWorkflow)
        .expect(400);
    });

    it("should create a new routing form workflow with  allowed actions", async () => {
      const validWorkflow = structuredClone(
        sampleCreateWorkflowRoutingFormDto
      ) as unknown as CreateEventTypeWorkflowDto;
      validWorkflow.steps = [
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
          action: "sms_attendee",
          recipient: EMAIL,
          template: REMINDER,
          phoneRequired: false,
          sender: "updatedSender",
          message: {
            subject: "Update Upcoming: {EVENT_NAME}",
            text: "Update Reminder for your event {EVENT_NAME}.</p>",
          },
        },
      ];
      return request(app.getHttpServer())
        .post(`${basePath}/routing-form`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send(validWorkflow)
        .expect(201)
        .then((response) => {
          const responseBody: GetRoutingFormWorkflowOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.name).toEqual(sampleCreateWorkflowRoutingFormDto.name);
          expect(responseBody.data.type).toEqual("routing-form");

          if (responseBody.data.activation instanceof WorkflowFormActivationDto) {
            expect(responseBody.data.activation.isActiveOnAllRoutingForms).toEqual(
              sampleCreateWorkflowRoutingFormDto.activation.isActiveOnAllRoutingForms
            );
          }

          expect(responseBody.data.trigger.type).toEqual(sampleCreateWorkflowRoutingFormDto.trigger.type);
          expect(responseBody.data.steps).toHaveLength(validWorkflow.steps.length);
          expect(responseBody.data.steps.find((step) => step.stepNumber === 1)?.id).toBeDefined();
          expect(responseBody.data.steps.find((step) => step.stepNumber === 1)?.sender).toEqual(
            "CalcomE2EStep1"
          );

          expect(responseBody.data.steps.find((step) => step.stepNumber === 2)?.id).toBeDefined();
          expect(responseBody.data.steps.find((step) => step.action === "sms_attendee")).toBeDefined();

          const trigger = sampleCreateWorkflowRoutingFormDto.trigger as OnFormSubmittedTriggerDto;
          expect(responseBody.data.trigger?.type).toEqual(trigger.type);

          createdFormWorkflowId = responseBody.data.id;
          createdFormWorkflow = responseBody.data;
        });
    });

    it("should create a new routing form workflow with  allowed actions and offset trigger", async () => {
      const validWorkflow = structuredClone(
        sampleCreateWorkflowRoutingFormDto
      ) as unknown as CreateFormWorkflowDto;
      validWorkflow.steps = [
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
      ];

      validWorkflow.trigger = {
        type: FORM_SUBMITTED_NO_EVENT,
        offset: {
          value: 1,
          unit: DAY,
        },
      };
      return request(app.getHttpServer())
        .post(`${basePath}/routing-form`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send(validWorkflow)
        .expect(201)
        .then((response) => {
          const responseBody: GetRoutingFormWorkflowOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.name).toEqual(sampleCreateWorkflowRoutingFormDto.name);
          expect(responseBody.data.type).toEqual("routing-form");

          if (responseBody.data.activation instanceof WorkflowFormActivationDto) {
            expect(responseBody.data.activation.isActiveOnAllRoutingForms).toEqual(
              sampleCreateWorkflowRoutingFormDto.activation.isActiveOnAllRoutingForms
            );
          }

          expect(responseBody.data.trigger.type).toEqual(validWorkflow.trigger.type);
          expect(responseBody.data.steps).toHaveLength(sampleCreateWorkflowRoutingFormDto.steps.length);
          expect(responseBody.data.steps.find((step) => step.stepNumber === 1)?.id).toBeDefined();
          expect(responseBody.data.steps.find((step) => step.stepNumber === 1)?.sender).toEqual(
            "CalcomE2EStep1"
          );

          const trigger = validWorkflow.trigger as OnFormSubmittedNoEventTriggerDto;
          expect(responseBody.data.trigger?.type).toEqual(trigger.type);
          expect(responseBody.data.trigger?.offset?.unit).toEqual(trigger.offset.unit);
          expect(responseBody.data.trigger?.offset?.value).toEqual(trigger.offset.value);
        });
    });

    it("should create a new workflow", async () => {
      return request(app.getHttpServer())
        .post(basePath)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ ...sampleCreateEventTypeWorkflowDto, type: undefined })
        .expect(201)
        .then((response) => {
          const responseBody: GetEventTypeWorkflowOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.name).toEqual(sampleCreateEventTypeWorkflowDto.name);
          if (responseBody.data.activation instanceof WorkflowActivationDto) {
            expect(responseBody.data.activation.isActiveOnAllEventTypes).toEqual(
              sampleCreateEventTypeWorkflowDto.activation.isActiveOnAllEventTypes
            );
          }

          expect(responseBody.data.trigger.type).toEqual(sampleCreateEventTypeWorkflowDto.trigger.type);
          expect(responseBody.data.steps).toHaveLength(sampleCreateEventTypeWorkflowDto.steps.length);
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
          const trigger = sampleCreateEventTypeWorkflowDto.trigger as OnBeforeEventTriggerDto;
          expect(responseBody.data.trigger?.offset?.value).toEqual(trigger.offset.value);
          expect(responseBody.data.trigger?.offset?.unit).toEqual(trigger.offset.unit);

          createdWorkflowId = responseBody.data.id;
          createdWorkflow = responseBody.data;
        });
    });

    it("should not create a new workflow", async () => {
      return request(app.getHttpServer())
        .post(basePath)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          ...sampleCreateEventTypeWorkflowDto,
          trigger: { ...sampleCreateEventTypeWorkflowDto, type: "formSubmitted" },
        })
        .expect(400);
    });

    it("should return 401 if not authenticated", async () => {
      return request(app.getHttpServer()).post(basePath).send(sampleCreateEventTypeWorkflowDto).expect(401);
    });

    it("should return 400 for invalid data (e.g. missing name)", async () => {
      const invalidDto = { ...sampleCreateEventTypeWorkflowDto, name: undefined };
      return request(app.getHttpServer())
        .post(basePath)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send(invalidDto)
        .expect(400);
    });
  });

  describe(`GET ${basePath}`, () => {
    it("should get a list of event-type workflows for the team", async () => {
      return request(app.getHttpServer())
        .get(`${basePath}?skip=0&take=10`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          const responseBody: GetEventTypeWorkflowsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeInstanceOf(Array);
          expect(responseBody.data.length).toBeGreaterThanOrEqual(1);
          expect(responseBody.data.some((wf) => wf.id === createdWorkflowId)).toBe(true);
          expect(responseBody.data.every((wf) => wf.type === "event-type")).toBe(true);
        });
    });

    it("should get a list of routing-form workflows for the team", async () => {
      return request(app.getHttpServer())
        .get(`${basePath}/routing-form?skip=0&take=10`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          const responseBody: GetRoutingFormWorkflowsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeInstanceOf(Array);
          expect(responseBody.data.length).toBeGreaterThanOrEqual(1);
          expect(responseBody.data.some((wf) => wf.id === createdFormWorkflowId)).toBe(true);
          expect(responseBody.data.every((wf) => wf.type === "routing-form")).toBe(true);
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
          const responseBody: GetEventTypeWorkflowOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.id).toEqual(createdWorkflowId);
          expect(responseBody.data.type).toEqual("event-type");
        });
    });

    it("should get a specific routing-form workflow by ID", async () => {
      expect(createdWorkflowId).toBeDefined();
      return request(app.getHttpServer())
        .get(`${basePath}/${createdFormWorkflowId}/routing-form`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          const responseBody: GetEventTypeWorkflowOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.id).toEqual(createdFormWorkflowId);
          expect(responseBody.data.type).toEqual("routing-form");
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

    it("should update an existing workflow, update the first and second step and discard other steps", async () => {
      const step2 = createdWorkflow.steps.find((step) => step.stepNumber === 2);
      expect(step2).toBeDefined();
      const step3 = createdWorkflow.steps.find((step) => step.stepNumber === 3);
      expect(step3).toBeDefined();
      const partialUpdateDto: Partial<CreateEventTypeWorkflowDto> = {
        name: updatedName,
        trigger: {
          type: "afterEvent",
          offset: {
            unit: "minute",
            value: 10,
          },
        },
        steps:
          step3 && step2
            ? [
                {
                  stepNumber: 1,
                  id: step3.id,
                  action: "email_address",
                  recipient: EMAIL,
                  template: REMINDER,
                  verifiedEmailId: verifiedEmailId2,
                  sender: "updatedSender",
                  includeCalendarEvent: false,
                  message: {
                    subject: "Update Upcoming: {EVENT_NAME}",
                    html: "<p>Update Reminder for your event {EVENT_NAME}.</p>",
                  },
                } as UpdateEmailAddressWorkflowStepDto,
                {
                  stepNumber: 2,
                  id: step2.id,
                  action: "whatsapp_number",
                  recipient: PHONE_NUMBER,
                  template: REMINDER,
                  verifiedPhoneId: verifiedPhoneId2,
                  sender: "updatedSender",
                  message: {
                    subject: "Update Upcoming: {EVENT_NAME}",
                    text: "Update Reminder for your event {EVENT_NAME}.",
                  },
                } as UpdatePhoneWhatsAppNumberWorkflowStepDto,
              ]
            : [],
      };
      expect(createdWorkflowId).toBeDefined();
      expect(createdWorkflow).toBeDefined();
      return request(app.getHttpServer())
        .patch(`${basePath}/${createdWorkflowId}`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send(partialUpdateDto)
        .expect(200)
        .then((response) => {
          const responseBody: GetEventTypeWorkflowOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.id).toEqual(createdWorkflowId);
          expect(responseBody.data.name).toEqual(updatedName);
          if (step3) {
            const newStep3 = responseBody.data.steps.find((step) => step.id === step3.id);
            expect(newStep3).toBeDefined();
            if (newStep3) {
              expect(newStep3.sender).toEqual("updatedSender");
              expect(newStep3.email).toEqual(emailToVerify);
              expect(newStep3.includeCalendarEvent).toEqual(false);
            }
          }
          if (step2) {
            const newStep2 = responseBody.data.steps.find((step) => step.id === step2.id);
            expect(newStep2).toBeDefined();
            if (newStep2) {
              expect(responseBody.data.steps[1].sender).toEqual("updatedSender");
              expect(responseBody.data.steps[1].phone).toEqual(phoneToVerify);
            }
          }

          // we updated 2 steps, third one should have been discarded
          expect(responseBody.data.steps[2]?.id).toBeUndefined();

          const trigger = partialUpdateDto.trigger as OnAfterEventTriggerDto;
          expect(responseBody.data.trigger?.type).toEqual(trigger.type);
          expect(responseBody.data.trigger?.offset?.value).toEqual(trigger.offset.value);
          expect(responseBody.data.trigger?.offset?.unit).toEqual(trigger.offset.unit);
        });
    });

    it("should not update an existing event-type workflow, trying to use form workflow trigger", async () => {
      const step2 = createdWorkflow.steps.find((step) => step.stepNumber === 2);
      expect(step2).toBeDefined();
      const step3 = createdWorkflow.steps.find((step) => step.stepNumber === 3);
      expect(step3).toBeDefined();
      const partialUpdateDto = {
        name: updatedName,
        trigger: {
          type: "formSubmitted",
          offset: {
            unit: "minute",
            value: 10,
          },
        },
      };

      expect(createdWorkflowId).toBeDefined();
      expect(createdWorkflow).toBeDefined();
      return request(app.getHttpServer())
        .patch(`${basePath}/${createdWorkflowId}`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send(partialUpdateDto)
        .expect(400);
    });

    it("should not update an existing event-type workflow, trying to use routing-form workflow endpoint", async () => {
      const partialUpdateDto = {
        name: updatedName,
      };

      expect(createdWorkflowId).toBeDefined();
      expect(createdWorkflow).toBeDefined();
      return request(app.getHttpServer())
        .patch(`${basePath}/${createdWorkflowId}/routing-form`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send(partialUpdateDto)
        .expect(404);
    });

    it("should update an existing routing form workflow, update the first step and discard any other steps", async () => {
      const step1 = createdFormWorkflow.steps.find((step) => step.stepNumber === 1);
      expect(step1).toBeDefined();

      const partialUpdateDto: Partial<CreateFormWorkflowDto> = {
        name: updatedName,
        trigger: {
          type: "formSubmitted",
        },
        steps: step1
          ? [
              {
                stepNumber: 1,
                id: step1.id,
                action: "email_address",
                recipient: EMAIL,
                template: REMINDER,
                verifiedEmailId: verifiedEmailId2,
                sender: "updatedSender",
                includeCalendarEvent: true,
                message: {
                  subject: "Update Upcoming: {EVENT_NAME}",
                  html: "<p>Update Reminder for your event {EVENT_NAME}.</p>",
                },
              } as UpdateEmailAddressWorkflowStepDto,
            ]
          : [],
      };
      expect(createdFormWorkflowId).toBeDefined();
      expect(createdFormWorkflow).toBeDefined();
      return request(app.getHttpServer())
        .patch(`${basePath}/${createdFormWorkflowId}/routing-form`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send(partialUpdateDto)
        .expect(200)
        .then((response) => {
          const responseBody: GetRoutingFormWorkflowOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.id).toEqual(createdFormWorkflowId);
          expect(responseBody.data.name).toEqual(updatedName);
          expect(responseBody.data.activation).toBeDefined();
          if (step1) {
            const newStep1 = responseBody.data.steps.find((step) => step.id === step1.id);
            expect(newStep1).toBeDefined();
            if (newStep1) {
              expect(newStep1.sender).toEqual("updatedSender");
              expect(newStep1.email).toEqual(emailToVerify);
              expect(newStep1.includeCalendarEvent).toEqual(true);
            }
          }

          // we updated 1 steps, no more steps should be defined
          expect(responseBody.data.steps[1]?.id).toBeUndefined();
          const trigger = partialUpdateDto.trigger as OnFormSubmittedTriggerDto;
          expect(responseBody.data.trigger?.type).toEqual(trigger.type);
          expect(responseBody.data.type).toEqual("routing-form");
        });
    });

    it("should return 404 for updating a non-existent workflow ID", async () => {
      const partialUpdateDto: Partial<CreateEventTypeWorkflowDto> = {
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
      const partialUpdateDto: Partial<CreateEventTypeWorkflowDto> = {
        name: updatedName,
        steps: [{ ...createdWorkflow.steps[0], sender: "updatedSender" } as WorkflowEmailAttendeeStepDto],
      };
      expect(createdWorkflowId).toBeDefined();
      return request(app.getHttpServer())
        .patch(`${basePath}/${createdWorkflowId}`)
        .send(partialUpdateDto)
        .expect(401);
    });

    it("should preserve time and timeUnit when not provided in partial update", async () => {
      const workflowWithOffset = await request(app.getHttpServer())
        .post(basePath)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          name: `Workflow With Offset ${randomString()}`,
          activation: {
            isActiveOnAllEventTypes: true,
            activeOnEventTypeIds: [],
          },
          trigger: {
            type: BEFORE_EVENT,
            offset: {
              value: 2,
              unit: DAY,
            },
          },
          steps: [
            {
              stepNumber: 1,
              action: "email_attendee",
              recipient: ATTENDEE,
              template: REMINDER,
              sender: "CalcomE2ETest",
              includeCalendarEvent: true,
              message: {
                subject: "Upcoming: {EVENT_NAME}",
                html: "<p>Reminder for your event {EVENT_NAME}.</p>",
              },
            },
          ],
        })
        .expect(201);

      const workflowId = workflowWithOffset.body.data.id;
      expect(workflowWithOffset.body.data.trigger?.offset?.value).toEqual(2);
      expect(workflowWithOffset.body.data.trigger?.offset?.unit).toEqual(DAY);

      const partialUpdateDto = {
        name: `Updated Workflow Name ${randomString()}`,
      };

      const updatedWorkflow = await request(app.getHttpServer())
        .patch(`${basePath}/${workflowId}`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send(partialUpdateDto)
        .expect(200);

      expect(updatedWorkflow.body.data.trigger?.offset?.value).toEqual(2);
      expect(updatedWorkflow.body.data.trigger?.offset?.unit).toEqual(DAY);

      await workflowsRepositoryFixture.delete(workflowId);
    });
  });

  describe(`DELETE ${basePath}/:workflowId`, () => {
    let workflowToDeleteId: number;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post(basePath)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({ ...sampleCreateEventTypeWorkflowDto, name: `Workflow To Delete ${randomString()}` });
      workflowToDeleteId = res.body.data.id;
    });

    it("should delete an existing event-type workflow", async () => {
      return request(app.getHttpServer())
        .delete(`${basePath}/${workflowToDeleteId}`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
        });
    });

    it("should delete an existing routing-form workflow", async () => {
      return request(app.getHttpServer())
        .delete(`${basePath}/${createdFormWorkflowId}/routing-form`)
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
