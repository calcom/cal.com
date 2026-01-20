import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { App_RoutingForms_Form, EventType, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { RoutingFormsRepositoryFixture } from "test/fixtures/repository/routing-forms.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import {
  ResponseSlotsOutput,
  ResponseSlotsOutputData,
} from "@/modules/routing-forms/outputs/response-slots.output";
import { SlotsModule_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Routing forms endpoints", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;
  let routingFormsRepositoryFixture: RoutingFormsRepositoryFixture;

  const teammateEmailTwo = `routing-forms-teammate-1-${randomString()}`;
  const teammateEmailOne = `routing-forms-teammate-2-${randomString()}`;

  let team: Team;
  let teammateOne: User;
  let teammateTwo: User;
  let collectiveEventTypeFootball: EventType;
  let collectiveEventTypeBasketball: EventType;

  let routingForm: App_RoutingForms_Form;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppModule,
        PrismaModule,
        UsersModule,
        TokensModule,
        SchedulesModule_2024_06_11,
        SlotsModule_2024_09_04,
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    routingFormsRepositoryFixture = new RoutingFormsRepositoryFixture(moduleRef);

    teammateOne = await userRepositoryFixture.create({
      email: teammateEmailOne,
      name: teammateEmailOne,
      username: teammateEmailOne,
    });

    teammateTwo = await userRepositoryFixture.create({
      email: teammateEmailTwo,
      name: teammateEmailTwo,
      username: teammateEmailTwo,
    });

    const teamSlug = `routing-forms-team-${randomString()}`;
    team = await teamRepositoryFixture.create({
      name: teamSlug,
      slug: teamSlug,
      isOrganization: false,
    });

    await membershipsRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: teammateOne.id } },
      team: { connect: { id: team.id } },
      accepted: true,
    });

    await membershipsRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: teammateTwo.id } },
      team: { connect: { id: team.id } },
      accepted: true,
    });

    const collectiveEventTypeFootballSlug = `routing-forms-collective-event-type-football-${randomString()}`;
    collectiveEventTypeFootball = await eventTypesRepositoryFixture.createTeamEventType({
      schedulingType: "COLLECTIVE",
      team: {
        connect: { id: team.id },
      },
      title: "Collective Event Type Football",
      slug: collectiveEventTypeFootballSlug,
      length: 60,
      assignAllTeamMembers: true,
      bookingFields: [],
      locations: [],
      schedule: {
        create: {
          name: "football",
          timeZone: "Europe/London",
          user: { connect: { id: teammateOne.id } },
          availability: {
            create: {
              days: [1],
              startTime: new Date("1970-01-01T09:00:00Z"),
              endTime: new Date("1970-01-01T11:00:00Z"),
            },
          },
        },
      },
      users: {
        connect: [{ id: teammateOne.id }, { id: teammateTwo.id }],
      },
      hosts: {
        create: [
          {
            userId: teammateOne.id,
            isFixed: true,
          },
          {
            userId: teammateTwo.id,
            isFixed: true,
          },
        ],
      },
    });

    const collectiveEventTypeBasketballSlug = `routing-forms-collective-event-type-basketball-${randomString()}`;
    collectiveEventTypeBasketball = await eventTypesRepositoryFixture.createTeamEventType({
      schedulingType: "COLLECTIVE",
      team: {
        connect: { id: team.id },
      },
      title: "Collective Event Type Basketball",
      slug: collectiveEventTypeBasketballSlug,
      length: 60,
      assignAllTeamMembers: true,
      bookingFields: [],
      locations: [],
      schedule: {
        create: {
          name: "basketball",
          timeZone: "Europe/London",
          user: { connect: { id: teammateTwo.id } },
          availability: {
            create: {
              days: [2],
              startTime: new Date("1970-01-01T11:00:00Z"),
              endTime: new Date("1970-01-01T13:00:00Z"),
            },
          },
        },
      },
      users: {
        connect: [{ id: teammateOne.id }, { id: teammateTwo.id }],
      },
      hosts: {
        create: [
          {
            userId: teammateOne.id,
            isFixed: true,
          },
          {
            userId: teammateTwo.id,
            isFixed: true,
          },
        ],
      },
    });

    routingForm = await routingFormsRepositoryFixture.create({
      name: "football or basketball",
      description: "Do you want to play football or basketball?",
      routes: [
        {
          id: "baba89aa-4567-489a-bcde-f1961b1ae10c",
          action: {
            type: "eventTypeRedirectUrl",
            value: `team/${team.slug}/${collectiveEventTypeFootballSlug}`,
            eventTypeId: collectiveEventTypeFootball.id,
          },
          queryValue: {
            id: "a8a8b9aa-0123-4456-b89a-b1961b1ae10c",
            type: "group",
            children1: {
              "99ab8aaa-4567-489a-bcde-f1961b1ae5cd": {
                type: "rule",
                properties: {
                  field: "dcd8b978-fa11-47be-801a-5ca2cd4ec16e",
                  value: ["755c11d1-fa46-4d03-8e15-d2c4ab3407d7"],
                  operator: "select_equals",
                  valueSrc: ["value"],
                  valueType: ["select"],
                  valueError: [null],
                },
              },
            },
          },
          attributesQueryValue: { id: "b8998aab-cdef-4012-b456-71961b1ae10c", type: "group" },
          attributeRoutingConfig: {},
          fallbackAttributesQueryValue: { id: "ab98888a-89ab-4cde-b012-31961b1ae10c", type: "group" },
        },
        {
          id: "88a98b98-0123-4456-b89a-b1961b1b1a04",
          action: {
            type: "eventTypeRedirectUrl",
            value: `team/${team.slug}/${collectiveEventTypeBasketballSlug}`,
            eventTypeId: collectiveEventTypeBasketball.id,
          },
          queryValue: {
            id: "bab8b9a8-cdef-4012-b456-71961b1b1a04",
            type: "group",
            children1: {
              "9988a98a-0123-4456-b89a-b1961b1b1f8b": {
                type: "rule",
                properties: {
                  field: "dcd8b978-fa11-47be-801a-5ca2cd4ec16e",
                  value: ["4cbb1537-0ab9-4286-b4bf-08b08ff23372"],
                  operator: "select_equals",
                  valueSrc: ["value"],
                  valueType: ["select"],
                  valueError: [null],
                },
              },
            },
          },
          attributesQueryValue: { id: "99a89a9b-89ab-4cde-b012-31961b1b1a04", type: "group" },
          attributeRoutingConfig: {},
          fallbackAttributesQueryValue: { id: "88989a98-4567-489a-bcde-f1961b1b1a04", type: "group" },
        },
        {
          id: "9b9ab9bb-cdef-4012-b456-71961b1a8b78",
          action: {
            type: "customPageMessage",
            value: "Thank you for your interest! We will be in touch soon.",
          },
          isFallback: true,
          queryValue: { id: "9b9ab9bb-cdef-4012-b456-71961b1a8b78", type: "group" },
          attributesQueryValue: { id: "88b988ab-cdef-4012-b456-71961b1ad81a", type: "group" },
          fallbackAttributesQueryValue: { id: "a8b89a9a-89ab-4cde-b012-31961b1ad81a", type: "group" },
        },
      ],
      createdAt: new Date("2025-04-09T15:10:46.651Z"),
      updatedAt: new Date("2025-04-09T15:11:37.696Z"),
      fields: [
        {
          id: "dcd8b978-fa11-47be-801a-5ca2cd4ec16e",
          type: "select",
          label: "sport",
          options: [
            { id: "755c11d1-fa46-4d03-8e15-d2c4ab3407d7", label: "football" },
            { id: "4cbb1537-0ab9-4286-b4bf-08b08ff23372", label: "basketball" },
          ],
          required: true,
        },
      ],
      user: {
        connect: { id: teammateOne.id },
      },
      disabled: false,
      settings: { emailOwnerOnSubmission: true },
      team: {
        connect: { id: team.id },
      },
      position: 0,
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  describe("Calculate slots", () => {
    const slotsQuery = "start=2060-01-12&end=2060-01-16";

    it("should return correct slots for option 1", async () => {
      const body = {
        sport: "football",
      };

      const reserveResponse = await request(app.getHttpServer())
        .post(`/v2/routing-forms/${routingForm.id}/calculate-slots?${slotsQuery}`)
        .send(body)
        .expect(200);

      const responseBody: ResponseSlotsOutput = reserveResponse.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const responseBodyData: ResponseSlotsOutputData = responseBody.data;
      expect(responseBodyData.eventTypeId).toEqual(collectiveEventTypeFootball.id);
      expect(responseBodyData.slots).toEqual({
        "2060-01-12": [
          {
            start: "2060-01-12T09:00:00.000Z",
          },
          {
            start: "2060-01-12T10:00:00.000Z",
          },
        ],
      });
    });

    it("should return correct slots for option 2", async () => {
      const body = {
        sport: "basketball",
      };

      const reserveResponse = await request(app.getHttpServer())
        .post(`/v2/routing-forms/${routingForm.id}/calculate-slots?${slotsQuery}`)
        .send(body)
        .expect(200);

      const responseBody: ResponseSlotsOutput = reserveResponse.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const responseBodyData: ResponseSlotsOutputData = responseBody.data;
      expect(responseBodyData.eventTypeId).toEqual(collectiveEventTypeBasketball.id);
      expect(responseBodyData.slots).toEqual({
        "2060-01-13": [
          {
            start: "2060-01-13T11:00:00.000Z",
          },
          {
            start: "2060-01-13T12:00:00.000Z",
          },
        ],
      });
    });
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(teammateOne.email);
    await userRepositoryFixture.deleteByEmail(teammateTwo.email);
    await teamRepositoryFixture.delete(team.id);
    await app.close();
  });
});
