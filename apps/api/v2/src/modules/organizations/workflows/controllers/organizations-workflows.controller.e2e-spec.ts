import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { CreateEventTypeWorkflowDto } from "@/modules/workflows/inputs/create-event-type-workflow.input";
import { CreateFormWorkflowDto } from "@/modules/workflows/inputs/create-form-workflow";
import { UpdateEventTypeWorkflowDto } from "@/modules/workflows/inputs/update-event-type-workflow.input";
import {
    ATTENDEE,
    EMAIL,
    PHONE_NUMBER,
    REMINDER,
} from "@/modules/workflows/inputs/workflow-step.input";
import {
    BEFORE_EVENT,
    DAY,
    FORM_SUBMITTED,
    OnBeforeEventTriggerDto,
} from "@/modules/workflows/inputs/workflow-trigger.input";
import {
    GetEventTypeWorkflowOutput,
    GetEventTypeWorkflowsOutput,
} from "@/modules/workflows/outputs/event-type-workflow.output";
import {
    GetRoutingFormWorkflowOutput,
    GetRoutingFormWorkflowsOutput,
} from "@/modules/workflows/outputs/routing-form-workflow.output";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
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
import type { Team, User } from "@calcom/prisma/client";

describe("OrganizationsWorkflowsController (E2E)", () => {
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
    let createdWorkflowId: number | undefined;
    let createdFormWorkflowId: number | undefined;
    let user: User;
    let apiKeyString: string;
    let verifiedEmailId: number;
    let verifiedPhoneId: number;
    const authEmail = `org-workflows-user-${randomString()}@example.com`;

    let sampleCreateEventTypeWorkflowDto = {
        name: `Org Workflow ${randomString()}`,
        activation: {
            isActiveOnAllEventTypes: false,
            activeOnEventTypeIds: [],
        },
        trigger: {
            type: BEFORE_EVENT,
            offset: {
                value: 1,
                unit: DAY,
            },
        } as OnBeforeEventTriggerDto,
        steps: [],
    } as unknown as CreateEventTypeWorkflowDto;

    let sampleCreateRoutingFormWorkflowDto: CreateFormWorkflowDto = {
        name: `Org Routing Workflow ${randomString()}`,
        activation: {
            isActiveOnAllRoutingForms: true,
            activeOnRoutingFormIds: [],
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

        userRepositoryFixture = new UserRepositoryFixture(moduleRef);
        organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
        teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
        profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
        apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
        membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
        workflowsRepositoryFixture = new WorkflowRepositoryFixture(moduleRef);
        verifiedResourcesRepositoryFixtures = new VerifiedResourcesRepositoryFixtures(moduleRef);

        org = await organizationsRepositoryFixture.create({
            name: `org-workflows-${randomString()}`,
            slug: `org-workflows-${randomString()}`,
            isOrganization: true,
            platformBilling: {
                create: {
                    customerId: "cus_org_workflows",
                    plan: "SCALE",
                    subscriptionId: "sub_org_workflows",
                },
            },
        });

        orgTeam = await teamsRepositoryFixture.create({
            name: `org-workflows-team-${randomString()}`,
            isOrganization: false,
            parent: { connect: { id: org.id } },
        });

        user = await userRepositoryFixture.create({
            email: authEmail,
            username: authEmail.split("@")[0],
        });

        const apiKey = await apiKeysRepositoryFixture.createApiKey(user.id, null);
        apiKeyString = apiKey.keyString;

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
            user: { connect: { id: user.id } },
            organization: { connect: { id: org.id } },
        });

        const verifiedEmail = await verifiedResourcesRepositoryFixtures.createEmail({
            user: { connect: { id: user.id } },
            email: authEmail,
            team: { connect: { id: org.id } },
        });

        const verifiedPhone = await verifiedResourcesRepositoryFixtures.createPhone({
            user: { connect: { id: user.id } },
            phoneNumber: "+37255551234",
            team: { connect: { id: org.id } },
        });

        verifiedEmailId = verifiedEmail.id;
        verifiedPhoneId = verifiedPhone.id;

        sampleCreateEventTypeWorkflowDto = {
            name: `Org Workflow ${randomString()}`,
            activation: {
                isActiveOnAllEventTypes: false,
                activeOnEventTypeIds: [orgTeam.id],
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
                    sender: "OrgWorkflowStep1",
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
                    verifiedPhoneId,
                    sender: "OrgWorkflowStep2",
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
                    verifiedEmailId,
                    sender: "OrgWorkflowStep3",
                    includeCalendarEvent: true,
                    message: {
                        subject: "Upcoming: {EVENT_NAME}",
                        html: "<p>Reminder for your event {EVENT_NAME}.</p>",
                    },
                },
            ],
        };

        sampleCreateRoutingFormWorkflowDto = {
            name: `Org Routing Workflow ${randomString()}`,
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
                    sender: "OrgRoutingStep1",
                    includeCalendarEvent: true,
                    message: {
                        subject: "Routing Form Submitted",
                        html: "<p>Thanks for your submission.</p>",
                    },
                },
            ],
        };

        basePath = `/v2/organizations/${org.id}/workflows`;
        app = moduleRef.createNestApplication();
        bootstrap(app as NestExpressApplication);
        await app.init();
    });

    afterAll(async () => {
        if (createdFormWorkflowId) {
            try {
                await workflowsRepositoryFixture.delete(createdFormWorkflowId);
            } catch {
                /* ignore */
            }
        }

        if (createdWorkflowId) {
            try {
                await workflowsRepositoryFixture.delete(createdWorkflowId);
            } catch {
                /* ignore */
            }
        }

        await userRepositoryFixture.deleteByEmail(user.email);
        await teamsRepositoryFixture.delete(orgTeam.id);
        await organizationsRepositoryFixture.delete(org.id);
        await app.close();
    });

    describe(`POST ${basePath}`, () => {
        it("creates an organization event-type workflow", async () => {
            const response = await request(app.getHttpServer())
                .post(basePath)
                .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
                .send(sampleCreateEventTypeWorkflowDto)
                .expect(201);

            const responseBody: GetEventTypeWorkflowOutput = response.body;
            createdWorkflowId = responseBody.data.id;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data.activation.activeOnTeamIds).toEqual(sampleCreateEventTypeWorkflowDto.activation.activeOnEventTypeIds);
        });

        it("creates an organization routing-form workflow", async () => {
            const response = await request(app.getHttpServer())
                .post(`${basePath}/routing-form`)
                .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
                .send(sampleCreateRoutingFormWorkflowDto)
                .expect(201);

            const responseBody: GetRoutingFormWorkflowOutput = response.body;
            createdFormWorkflowId = responseBody.data.id;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data.trigger.type).toEqual(sampleCreateRoutingFormWorkflowDto.trigger.type);
        });
    });

    describe(`GET ${basePath}`, () => {
        it("lists organization workflows with team activation metadata", async () => {
            const response = await request(app.getHttpServer())
                .get(basePath)
                .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
                .expect(200);

            const responseBody: GetEventTypeWorkflowsOutput = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data.length).toBeGreaterThanOrEqual(1);
            const workflow = responseBody.data.find((item) => item.id === createdWorkflowId);
            expect(workflow?.activation.activeOnTeamIds).toEqual(sampleCreateEventTypeWorkflowDto.activation.activeOnEventTypeIds);
        });

        it("lists organization routing-form workflows", async () => {
            const response = await request(app.getHttpServer())
                .get(`${basePath}/routing-form`)
                .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
                .expect(200);

            const responseBody: GetRoutingFormWorkflowsOutput = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data.length).toBeGreaterThanOrEqual(1);
            expect(responseBody.data.some((workflow) => workflow.id === createdFormWorkflowId)).toBeTruthy();
        });
    });

    describe(`GET ${basePath}/:workflowId`, () => {
        it("fetches a specific organization workflow", async () => {
            const response = await request(app.getHttpServer())
                .get(`${basePath}/${createdWorkflowId!}`)
                .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
                .expect(200);

            const responseBody: GetEventTypeWorkflowOutput = response.body;
            expect(responseBody.data.id).toEqual(createdWorkflowId);
            expect(responseBody.data.activation.activeOnTeamIds).toEqual(sampleCreateEventTypeWorkflowDto.activation.activeOnEventTypeIds);
        });
    });

    describe(`PATCH ${basePath}/:workflowId`, () => {
        it("updates an organization workflow", async () => {
            const updatePayload: UpdateEventTypeWorkflowDto = {
                name: `Updated Org Workflow ${randomString()}`,
                activation: {
                    isActiveOnAllEventTypes: true,
                    activeOnEventTypeIds: [],
                },
            };

            const response = await request(app.getHttpServer())
                .patch(`${basePath}/${createdWorkflowId!}`)
                .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
                .send(updatePayload)
                .expect(200);

            const responseBody: GetEventTypeWorkflowOutput = response.body;
            expect(responseBody.data.name).toEqual(updatePayload.name);
            expect(responseBody.data.activation.isActiveOnAllEventTypes).toBeTruthy();
            expect(responseBody.data.activation.activeOnTeamIds).toEqual([]);
        });

        it("updates an organization routing-form workflow", async () => {
            const updatePayload = {
                name: `Updated Org Routing Workflow ${randomString()}`,
                activation: { isActiveOnAllRoutingForms: false, activeOnRoutingFormIds: [] },
            };

            const response = await request(app.getHttpServer())
                .patch(`${basePath}/${createdFormWorkflowId!}/routing-form`)
                .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
                .send(updatePayload)
                .expect(200);

            const responseBody: GetRoutingFormWorkflowOutput = response.body;
            expect(responseBody.data.name).toEqual(updatePayload.name);
            expect(responseBody.data.activation.isActiveOnAllRoutingForms).toEqual(updatePayload.activation.isActiveOnAllRoutingForms);
        });
    });

    describe(`DELETE ${basePath}/:workflowId`, () => {
        it("deletes an organization routing-form workflow", async () => {
            await request(app.getHttpServer())
                .delete(`${basePath}/${createdFormWorkflowId!}/routing-form`)
                .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
                .expect(200);

            createdFormWorkflowId = undefined;
        });

        it("deletes an organization workflow", async () => {
            await request(app.getHttpServer())
                .delete(`${basePath}/${createdWorkflowId!}`)
                .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
                .expect(200);

            createdWorkflowId = undefined;
        });
    });
});

