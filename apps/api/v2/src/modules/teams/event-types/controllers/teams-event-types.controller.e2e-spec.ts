import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_06_14 } from "@calcom/platform-constants";
import {
  BookerLayoutsInputEnum_2024_06_14,
  BookingWindowPeriodInputTypeEnum_2024_06_14,
  ConfirmationPolicyEnum,
  NoticeThresholdUnitEnum,
} from "@calcom/platform-enums";
import type {
  ApiSuccessResponse,
  CreateTeamEventTypeInput_2024_06_14,
  EventTypeOutput_2024_06_14,
  Host,
  TeamEventTypeOutput_2024_06_14,
  UpdateTeamEventTypeInput_2024_06_14,
} from "@calcom/platform-types";
import type { Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { HOSTS_REQUIRED_WHEN_SWITCHING_SCHEDULING_TYPE_ERROR } from "@/modules/organizations/event-types/services/input.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Organizations Event Types Endpoints", () => {
  describe("User Authentication - User is Org Admin", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;

    let team: Team;
    let falseTestTeam: Team;

    const userEmail = `teams-event-types-user-${randomString()}@api.com`;
    let userAdmin: User;

    const teammate1Email = `teams-event-types-teammate1-${randomString()}@api.com`;
    const teammate2Email = `teams-event-types-teammate2-${randomString()}@api.com`;
    const falseTestUserEmail = `teams-event-types-false-user-${randomString()}@api.com`;
    let teamMember1: User;
    let teamMember2: User;
    let falseTestUser: User;

    let collectiveEventType: TeamEventTypeOutput_2024_06_14;
    let managedEventType: TeamEventTypeOutput_2024_06_14;

    async function ensureManagedEventType(): Promise<TeamEventTypeOutput_2024_06_14> {
      if (!managedEventType) {
        const setupBody: CreateTeamEventTypeInput_2024_06_14 = {
          title: `teams-event-types-managed-${randomString()}`,
          slug: `teams-event-types-managed-${randomString()}`,
          description: "Our team will review your codebase.",
          lengthInMinutes: 60,
          locations: [
            {
              type: "integration",
              integration: "cal-video",
            },
          ],
          schedulingType: "MANAGED",
          hosts: [
            {
              userId: teamMember1.id,
              mandatory: true,
              priority: "high",
            },
            {
              userId: teamMember2.id,
              mandatory: false,
              priority: "low",
            },
          ],
        };

        const setupResponse = await request(app.getHttpServer())
          .post(`/v2/teams/${team.id}/event-types`)
          .send(setupBody)
          .expect(201);

        const setupResponseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]> = setupResponse.body;
        const responseTeamEvent = setupResponseBody.data.find((event) => event.teamId === team.id);
        if (responseTeamEvent) {
          managedEventType = responseTeamEvent;
        }
      }
      return managedEventType;
    }

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

      userAdmin = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        role: "ADMIN",
      });

      teamMember1 = await userRepositoryFixture.create({
        email: teammate1Email,
        username: teammate1Email,
        name: "alice",
      });

      teamMember2 = await userRepositoryFixture.create({
        email: teammate2Email,
        username: teammate2Email,
        name: "bob",
      });

      falseTestUser = await userRepositoryFixture.create({
        email: falseTestUserEmail,
        username: falseTestUserEmail,
      });

      team = await teamsRepositoryFixture.create({
        name: `teams-event-types-team-${randomString()}`,
        isOrganization: false,
      });

      falseTestTeam = await teamsRepositoryFixture.create({
        name: `teams-event-types-false-team-${randomString()}`,
        isOrganization: false,
      });

      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: userAdmin.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teamMember1.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teamMember2.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: falseTestUser.id } },
        team: { connect: { id: falseTestTeam.id } },
        accepted: true,
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should not be able to create event-type for user outside team", async () => {
      const userId = falseTestUser.id;

      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: "Coding consultation",
        slug: "coding-consultation",
        description: "Our team will review your codebase.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "cal-video",
          },
        ],
        schedulingType: "COLLECTIVE",
        hosts: [
          {
            userId,
            mandatory: true,
            priority: "high",
          },
        ],
      };

      return request(app.getHttpServer()).post(`/v2/teams/${team.id}/event-types`).send(body).expect(404);
    });

    it("should not be able to create managed event-type for user outside team", async () => {
      const userId = falseTestUser.id;

      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: `managed-outside-team-${randomString()}`,
        slug: `managed-outside-team-${randomString()}`,
        description: "Managed event type with non-team member.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "cal-video",
          },
        ],
        schedulingType: "MANAGED",
        hosts: [
          {
            userId,
            mandatory: true,
            priority: "high",
          },
        ],
      };

      return request(app.getHttpServer()).post(`/v2/teams/${team.id}/event-types`).send(body).expect(404);
    });

    it("should not be able to create phone-only event type", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: "Phone coding consultation",
        slug: "phone-coding-consultation",
        description: "Our team will review your codebase.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "cal-video",
          },
          {
            type: "organizersDefaultApp",
          },
        ],
        schedulingType: "COLLECTIVE",
        hosts: [
          {
            userId: teamMember1.id,
          },
          {
            userId: teamMember2.id,
          },
        ],
        bookingFields: [
          {
            type: "email",
            required: false,
            label: "Email",
            hidden: true,
          },
          {
            type: "phone",
            slug: "attendeePhoneNumber",
            required: true,
            label: "Phone number",
            hidden: false,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/event-types`)
        .send(body)
        .expect(400);
      expect(response.body.error.message).toBe(
        "checkIsEmailUserAccessible - Email booking field must be required and visible"
      );
    });

    it("should not allow creating an event type with integration not installed on team", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: "Coding consultation",
        slug: "coding-consultation",
        description: "Our team will review your codebase.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "zoom",
          },
        ],
        schedulingType: "COLLECTIVE",
        hosts: [
          {
            userId: teamMember1.id,
          },
          {
            userId: teamMember2.id,
          },
        ],
      };

      return request(app.getHttpServer()).post(`/v2/teams/${team.id}/event-types`).send(body).expect(400);
    });

    it("should create a collective team event-type", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: `teams-event-types-collective-${randomString()}`,
        slug: `teams-event-types-collective-${randomString()}`,
        description: "Our team will review your codebase.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "cal-video",
          },
        ],
        bookingFields: [
          {
            type: "select",
            label: "select which language is your codebase in",
            slug: "select-language",
            required: true,
            placeholder: "select language",
            options: ["javascript", "python", "cobol"],
          },
        ],
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        schedulingType: "collective",
        hosts: [
          {
            userId: teamMember1.id,
          },
          {
            userId: teamMember2.id,
          },
        ],
        bookingLimitsCount: {
          day: 2,
          week: 5,
        },
        onlyShowFirstAvailableSlot: true,
        bookingLimitsDuration: {
          day: 60,
          week: 100,
        },
        offsetStart: 30,
        bookingWindow: {
          type: BookingWindowPeriodInputTypeEnum_2024_06_14.calendarDays,
          value: 30,
          rolling: true,
        },
        bookerLayouts: {
          enabledLayouts: [
            BookerLayoutsInputEnum_2024_06_14.column,
            BookerLayoutsInputEnum_2024_06_14.month,
            BookerLayoutsInputEnum_2024_06_14.week,
          ],
          defaultLayout: BookerLayoutsInputEnum_2024_06_14.month,
        },

        confirmationPolicy: {
          type: ConfirmationPolicyEnum.TIME,
          noticeThreshold: {
            count: 60,
            unit: NoticeThresholdUnitEnum.MINUTES,
          },
          blockUnconfirmedBookingsInBooker: true,
        },
        requiresBookerEmailVerification: true,
        hideCalendarNotes: true,
        hideCalendarEventDetails: true,
        hideOrganizerEmail: true,
        lockTimeZoneToggleOnBookingPage: true,
        color: {
          darkThemeHex: "#292929",
          lightThemeHex: "#fafafa",
        },
      };

      return request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/event-types`)
        .send(body)
        .expect(201)
        .then((response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.title).toEqual(body.title);
          expect(data.hosts.length).toEqual(2);
          expect(data.schedulingType).toEqual("collective");
          evaluateHost(body.hosts?.[0] || { userId: -1 }, data.hosts[0]);
          evaluateHost(body.hosts?.[1] || { userId: -1 }, data.hosts[1]);
          expect(data.bookingLimitsCount).toEqual(body.bookingLimitsCount);
          expect(data.onlyShowFirstAvailableSlot).toEqual(body.onlyShowFirstAvailableSlot);
          expect(data.bookingLimitsDuration).toEqual(body.bookingLimitsDuration);
          expect(data.offsetStart).toEqual(body.offsetStart);
          expect(data.bookingWindow).toEqual(body.bookingWindow);
          expect(data.bookerLayouts).toEqual(body.bookerLayouts);
          expect(data.confirmationPolicy).toEqual(body.confirmationPolicy);
          expect(data.requiresBookerEmailVerification).toEqual(body.requiresBookerEmailVerification);
          expect(data.hideCalendarNotes).toEqual(body.hideCalendarNotes);
          expect(data.hideCalendarEventDetails).toEqual(body.hideCalendarEventDetails);
          expect(data.hideOrganizerEmail).toEqual(body.hideOrganizerEmail);
          expect(data.lockTimeZoneToggleOnBookingPage).toEqual(body.lockTimeZoneToggleOnBookingPage);
          expect(data.color).toEqual(body.color);

          collectiveEventType = responseBody.data;
        });
    });

    it("should create a managed team event-type", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: `teams-event-types-managed-${randomString()}`,
        slug: `teams-event-types-managed-${randomString()}`,
        description: "Our team will review your codebase.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "cal-video",
          },
        ],
        schedulingType: "MANAGED",
        hosts: [
          {
            userId: teamMember1.id,
            mandatory: true,
            priority: "high",
          },
          {
            userId: teamMember2.id,
            mandatory: false,
            priority: "low",
          },
        ],
      };

      return request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/event-types`)
        .send(body)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.length).toEqual(3);

          const teammate1EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teamMember1.id);
          const teammate2EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teamMember2.id);
          const teamEventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(team.id);

          const teammate1ManagedEvents = teammate1EventTypes.filter((et) => et.title === body.title);
          const teammate2ManagedEvents = teammate2EventTypes.filter((et) => et.title === body.title);
          const managedTeamEvents = teamEventTypes.filter(
            (eventType) => eventType.schedulingType === "MANAGED" && eventType.title === body.title
          );

          expect(teammate1ManagedEvents.length).toEqual(1);
          expect(teammate1ManagedEvents[0].title).toEqual(body.title);
          expect(teammate2ManagedEvents.length).toEqual(1);
          expect(managedTeamEvents.length).toEqual(1);

          const responseTeamEvent = responseBody.data.find((event) => event.teamId === team.id);
          expect(responseTeamEvent).toBeDefined();
          expect(responseTeamEvent?.hosts).toHaveLength(2);
          expect(responseTeamEvent?.hosts).toEqual(
            expect.arrayContaining([
              {
                userId: teamMember1.id,
                name: teamMember1.name,
                username: teamMember1.username,
                avatarUrl: teamMember1.avatarUrl,
              },
              {
                userId: teamMember2.id,
                name: teamMember2.name,
                username: teamMember2.username,
                avatarUrl: teamMember2.avatarUrl,
              },
            ])
          );

          if (!responseTeamEvent) {
            throw new Error("Team event not found");
          }

          const responseTeammate1Event = responseBody.data.find((event) => event.ownerId === teamMember1.id);
          expect(responseTeammate1Event).toBeDefined();
          expect(responseTeammate1Event?.parentEventTypeId).toEqual(responseTeamEvent?.id);

          const responseTeammate2Event = responseBody.data.find((event) => event.ownerId === teamMember2.id);
          expect(responseTeammate2Event).toBeDefined();
          expect(responseTeammate2Event?.parentEventTypeId).toEqual(responseTeamEvent?.id);

          managedEventType = responseTeamEvent;
        });
    });

    it("managed team event types should be returned when fetching event types of users", async () => {
      await ensureManagedEventType();

      return request(app.getHttpServer())
        .get(`/v2/event-types?username=${teamMember1.username}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          const managedEvents = data.filter((event) => event.slug === managedEventType.slug);
          expect(managedEvents.length).toEqual(1);
          expect(managedEvents[0].slug).toEqual(managedEventType.slug);
          expect(managedEvents[0].ownerId).toEqual(teamMember1.id);
          expect(managedEvents[0].id).not.toEqual(managedEventType.id);
        });
    });

    it("managed team event type should be returned when fetching event types of users", async () => {
      await ensureManagedEventType();

      return request(app.getHttpServer())
        .get(`/v2/event-types?username=${teamMember1.username}&eventSlug=${managedEventType?.slug}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          const managedEventTypes = data.filter((et) => et.slug === managedEventType?.slug);
          expect(managedEventTypes.length).toEqual(1);
          expect(managedEventTypes[0].slug).toEqual(managedEventType?.slug);
          expect(managedEventTypes[0].ownerId).toEqual(teamMember1.id);
          expect(managedEventTypes[0].id).not.toEqual(managedEventType?.id);
        });
    });

    it("should not get a non existing event-type", async () => {
      return request(app.getHttpServer()).get(`/v2/teams/${team.id}/event-types/999999`).expect(404);
    });

    it("should get a team event-type", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/event-types/${collectiveEventType.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.title).toEqual(collectiveEventType.title);
          expect(data.hosts.length).toEqual(2);
          evaluateHost(collectiveEventType.hosts[0], data.hosts[0]);
          evaluateHost(collectiveEventType.hosts[1], data.hosts[1]);

          collectiveEventType = responseBody.data;
        });
    });

    it("should get team event-types", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/event-types`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.length).toEqual(2);

          const eventTypeCollective = data.find((eventType) => eventType.schedulingType === "collective");
          const eventTypeManaged = data.find((eventType) => eventType.schedulingType === "managed");

          expect(eventTypeCollective?.title).toEqual(collectiveEventType.title);
          expect(eventTypeCollective?.hosts.length).toEqual(2);

          expect(eventTypeManaged?.title).toEqual(managedEventType.title);
          expect(eventTypeManaged?.hosts.length).toEqual(2);
          evaluateHost(collectiveEventType.hosts[0], eventTypeCollective?.hosts[0]);
          evaluateHost(collectiveEventType.hosts[1], eventTypeCollective?.hosts[1]);
        });
    });

    it("should not be able to update managed event-type with user outside team", async () => {
      await ensureManagedEventType();

      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        hosts: [
          {
            userId: falseTestUser.id,
            mandatory: true,
            priority: "high",
          },
        ],
      };

      return request(app.getHttpServer())
        .patch(`/v2/teams/${team.id}/event-types/${managedEventType?.id}`)
        .send(body)
        .expect(404);
    });

    it("should not be able to update non existing event-type", async () => {
      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        title: "Clean code consultation",
      };

      return request(app.getHttpServer())
        .patch(`/v2/teams/${team.id}/event-types/999999`)
        .send(body)
        .expect(400);
    });

    it("should not allow to update event type with integration not installed on team", async () => {
      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        locations: [
          {
            type: "integration",
            integration: "office365-video",
          },
        ],
      };

      return request(app.getHttpServer())
        .patch(`/v2/teams/${team.id}/event-types/${collectiveEventType.id}`)
        .send(body)
        .expect(400);
    });

    it("should update collective event-type", async () => {
      const newHosts: UpdateTeamEventTypeInput_2024_06_14["hosts"] = [
        {
          userId: teamMember1.id,
        },
      ];

      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        hosts: newHosts,
      };

      return request(app.getHttpServer())
        .patch(`/v2/teams/${team.id}/event-types/${collectiveEventType.id}`)
        .send(body)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const eventType = responseBody.data;
          expect(eventType.title).toEqual(collectiveEventType.title);
          expect(eventType.hosts.length).toEqual(1);
          evaluateHost(eventType.hosts[0], newHosts[0]);
        });
    });

    it("should update managed event-type", async () => {
      await ensureManagedEventType();

      const newTitle = `teams-event-types-managed-updated-${randomString()}`;
      const newHosts: UpdateTeamEventTypeInput_2024_06_14["hosts"] = [
        {
          userId: teamMember1.id,
          mandatory: true,
          priority: "medium",
        },
      ];

      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        title: newTitle,
        hosts: newHosts,
      };

      return request(app.getHttpServer())
        .patch(`/v2/teams/${team.id}/event-types/${managedEventType?.id}`)
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.length).toEqual(2);

          const teammate1EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teamMember1.id);
          const teammate2EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teamMember2.id);
          const teamEventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(team.id);
          const managedTeamEventTypes = teamEventTypes.filter(
            (eventType) => eventType.schedulingType === "MANAGED"
          );

          expect(teammate1EventTypes.length).toEqual(1);
          expect(teammate1EventTypes[0].title).toEqual(newTitle);
          expect(teammate2EventTypes.length).toEqual(0);
          expect(managedTeamEventTypes.length).toEqual(1);
          expect(managedTeamEventTypes[0].assignAllTeamMembers).toEqual(false);
          expect(
            teamEventTypes.filter((eventType) => eventType.schedulingType === "MANAGED")?.[0]?.title
          ).toEqual(newTitle);

          const responseTeamEvent = responseBody.data.find(
            (eventType) => eventType.schedulingType === "managed"
          );
          expect(responseTeamEvent).toBeDefined();
          expect(responseTeamEvent?.title).toEqual(newTitle);
          expect(responseTeamEvent?.assignAllTeamMembers).toEqual(false);

          const responseTeammate1Event = responseBody.data.find(
            (eventType) => eventType.ownerId === teamMember1.id
          );
          expect(responseTeammate1Event).toBeDefined();
          expect(responseTeammate1Event?.title).toEqual(newTitle);

          managedEventType = responseBody.data[0];
        });
    });

    it("should assign all members to managed event-type", async () => {
      await ensureManagedEventType();

      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        assignAllTeamMembers: true,
      };

      return request(app.getHttpServer())
        .patch(`/v2/teams/${team.id}/event-types/${managedEventType?.id}`)
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          // note(Lauris): we expect 4 because we have 2 team members, 1 team admin and 4th is the event object itself.
          expect(data.length).toEqual(4);

          const teammate1EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teamMember1.id);
          const teammate2EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teamMember2.id);
          const teamEventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(team.id);
          const managedTeamEventTypes = teamEventTypes.filter(
            (eventType) => eventType.schedulingType === "MANAGED"
          );

          expect(teammate1EventTypes.length).toEqual(1);
          expect(teammate2EventTypes.length).toEqual(1);
          expect(managedTeamEventTypes.length).toEqual(1);
          expect(managedTeamEventTypes[0].assignAllTeamMembers).toEqual(true);

          const responseTeamEvent = responseBody.data.find(
            (eventType) => eventType.schedulingType === "managed"
          );
          expect(responseTeamEvent).toBeDefined();
          expect(responseTeamEvent?.teamId).toEqual(team.id);
          expect(responseTeamEvent?.assignAllTeamMembers).toEqual(true);

          const responseTeammate1Event = responseBody.data.find(
            (eventType) => eventType.ownerId === teamMember1.id
          );
          expect(responseTeammate1Event).toBeDefined();
          expect(responseTeammate1Event?.parentEventTypeId).toEqual(responseTeamEvent?.id);

          const responseTeammate2Event = responseBody.data.find(
            (eventType) => eventType.ownerId === teamMember2.id
          );
          expect(responseTeammate1Event).toBeDefined();
          expect(responseTeammate2Event?.parentEventTypeId).toEqual(responseTeamEvent?.id);

          if (responseTeamEvent) {
            managedEventType = responseTeamEvent;
          }
        });
    });

    it("should delete event-type not part of the team", async () => {
      return request(app.getHttpServer()).delete(`/v2/teams/${team.id}/event-types/99999`).expect(404);
    });

    it("should delete collective event-type", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/teams/${team.id}/event-types/${collectiveEventType.id}`)
        .expect(200);
    });

    it("should delete managed event-type", async () => {
      await ensureManagedEventType();

      return request(app.getHttpServer())
        .delete(`/v2/teams/${team.id}/event-types/${managedEventType?.id}`)
        .expect(200);
    });

    function evaluateHost(expected: Host, received: Host | undefined) {
      expect(expected.userId).toEqual(received?.userId);
      expect(expected.mandatory).toEqual(received?.mandatory);
      expect(expected.priority).toEqual(received?.priority);
    }

    describe("updating scheduling type", () => {
      it("should return 400 error if schedulingType: managed is passed", async () => {
        const createBody: CreateTeamEventTypeInput_2024_06_14 = {
          title: `teams-event-types-scheduling-collective-${randomString()}`,
          slug: `teams-event-types-scheduling-collective-${randomString()}`,
          description: "Test collective event type",
          lengthInMinutes: 60,
          locations: [
            {
              type: "integration",
              integration: "cal-video",
            },
          ],
          schedulingType: "COLLECTIVE",
          hosts: [
            {
              userId: teamMember1.id,
            },
          ],
        };

        const createResponse = await request(app.getHttpServer())
          .post(`/v2/teams/${team.id}/event-types`)
          .send(createBody)
          .expect(201);

        const createdEventType: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = createResponse.body;

        const updateBody = {
          schedulingType: "managed",
        };

        await request(app.getHttpServer())
          .patch(`/v2/teams/${team.id}/event-types/${createdEventType.data.id}`)
          .send(updateBody)
          .expect(400);

        await eventTypesRepositoryFixture.delete(createdEventType.data.id);
      });

      it("should require hosts when changing round robin event type to collective without providing hosts", async () => {
        const createBody: CreateTeamEventTypeInput_2024_06_14 = {
          title: `teams-event-types-scheduling-roundrobin-${randomString()}`,
          slug: `teams-event-types-scheduling-roundrobin-${randomString()}`,
          description: "Test round robin event type",
          lengthInMinutes: 60,
          locations: [
            {
              type: "integration",
              integration: "cal-video",
            },
          ],
          schedulingType: "ROUND_ROBIN",
          hosts: [
            {
              userId: teamMember1.id,
              priority: "high",
            },
            {
              userId: teamMember2.id,
              priority: "low",
            },
          ],
        };

        const createResponse = await request(app.getHttpServer())
          .post(`/v2/teams/${team.id}/event-types`)
          .send(createBody)
          .expect(201);

        const createdEventType: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = createResponse.body;

        const updateBody = {
          schedulingType: "collective",
        };

        const response = await request(app.getHttpServer())
          .patch(`/v2/teams/${team.id}/event-types/${createdEventType.data.id}`)
          .send(updateBody);

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(HOSTS_REQUIRED_WHEN_SWITCHING_SCHEDULING_TYPE_ERROR);

        await eventTypesRepositoryFixture.delete(createdEventType.data.id);
      });

      it("should require hosts when changing collective event type to roundRobin without providing hosts", async () => {
        const createBody: CreateTeamEventTypeInput_2024_06_14 = {
          title: `teams-event-types-scheduling-collective-${randomString()}`,
          slug: `teams-event-types-scheduling-collective-${randomString()}`,
          description: "Test collective event type",
          lengthInMinutes: 60,
          locations: [
            {
              type: "integration",
              integration: "cal-video",
            },
          ],
          schedulingType: "COLLECTIVE",
          hosts: [
            {
              userId: teamMember1.id,
            },
            {
              userId: teamMember2.id,
            },
          ],
        };

        const createResponse = await request(app.getHttpServer())
          .post(`/v2/teams/${team.id}/event-types`)
          .send(createBody)
          .expect(201);

        const createdEventType: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = createResponse.body;

        const updateBody = {
          schedulingType: "roundRobin",
        };

        const response = await request(app.getHttpServer())
          .patch(`/v2/teams/${team.id}/event-types/${createdEventType.data.id}`)
          .send(updateBody);

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(HOSTS_REQUIRED_WHEN_SWITCHING_SCHEDULING_TYPE_ERROR);

        await eventTypesRepositoryFixture.delete(createdEventType.data.id);
      });

      it("should change round robin event type to collective and pass new hosts", async () => {
        const createBody: CreateTeamEventTypeInput_2024_06_14 = {
          title: `teams-event-types-scheduling-roundrobin-${randomString()}`,
          slug: `teams-event-types-scheduling-roundrobin-${randomString()}`,
          description: "Test round robin event type",
          lengthInMinutes: 60,
          locations: [
            {
              type: "integration",
              integration: "cal-video",
            },
          ],
          schedulingType: "ROUND_ROBIN",
          hosts: [
            {
              userId: teamMember1.id,
              priority: "high",
            },
          ],
        };

        const createResponse = await request(app.getHttpServer())
          .post(`/v2/teams/${team.id}/event-types`)
          .send(createBody)
          .expect(201);

        const createdEventType: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = createResponse.body;

        const updateBody = {
          schedulingType: "collective",
          hosts: [
            {
              userId: teamMember2.id,
            },
          ],
        };

        const updateResponse = await request(app.getHttpServer())
          .patch(`/v2/teams/${team.id}/event-types/${createdEventType.data.id}`)
          .send(updateBody)
          .expect(200);

        const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = updateResponse.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data.schedulingType).toEqual("collective");
        expect(responseBody.data.hosts).toHaveLength(1);
        expect(responseBody.data.hosts[0].userId).toEqual(teamMember2.id);

        await eventTypesRepositoryFixture.delete(createdEventType.data.id);
      });

      it("should change collective event type to roundRobin and pass new hosts", async () => {
        const createBody = {
          title: `teams-event-types-scheduling-collective-${randomString()}`,
          slug: `teams-event-types-scheduling-collective-${randomString()}`,
          description: "Test collective event type",
          lengthInMinutes: 60,
          locations: [
            {
              type: "integration",
              integration: "cal-video",
            },
          ],
          schedulingType: "collective",
          hosts: [
            {
              userId: teamMember1.id,
            },
          ],
        };

        const createResponse = await request(app.getHttpServer())
          .post(`/v2/teams/${team.id}/event-types`)
          .send(createBody)
          .expect(201);

        const createdEventType: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = createResponse.body;

        const updateBody = {
          schedulingType: "roundRobin",
          hosts: [
            {
              userId: teamMember2.id,
              priority: "medium",
            },
          ],
        };

        const updateResponse = await request(app.getHttpServer())
          .patch(`/v2/teams/${team.id}/event-types/${createdEventType.data.id}`)
          .send(updateBody)
          .expect(200);

        const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = updateResponse.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data.schedulingType).toEqual("roundRobin");
        expect(responseBody.data.hosts).toHaveLength(1);
        expect(responseBody.data.hosts[0].userId).toEqual(teamMember2.id);

        await eventTypesRepositoryFixture.delete(createdEventType.data.id);
      });

      it("should change collective event type to roundRobin with assignAllTeamMembers: true", async () => {
        const createBody: CreateTeamEventTypeInput_2024_06_14 = {
          title: `teams-event-types-scheduling-collective-${randomString()}`,
          slug: `teams-event-types-scheduling-collective-${randomString()}`,
          description: "Test collective event type",
          lengthInMinutes: 60,
          locations: [
            {
              type: "integration",
              integration: "cal-video",
            },
          ],
          schedulingType: "COLLECTIVE",
          hosts: [
            {
              userId: teamMember1.id,
            },
          ],
        };

        const createResponse = await request(app.getHttpServer())
          .post(`/v2/teams/${team.id}/event-types`)
          .send(createBody)
          .expect(201);

        const createdEventType: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = createResponse.body;

        const updateBody = {
          schedulingType: "roundRobin",
          assignAllTeamMembers: true,
        };

        const updateResponse = await request(app.getHttpServer())
          .patch(`/v2/teams/${team.id}/event-types/${createdEventType.data.id}`)
          .send(updateBody)
          .expect(200);

        const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = updateResponse.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data.schedulingType).toEqual("roundRobin");
        expect(responseBody.data.hosts).toHaveLength(3);
        const hostUserIds = responseBody.data.hosts.map((host) => host.userId);
        expect(hostUserIds).toContain(teamMember1.id);
        expect(hostUserIds).toContain(teamMember2.id);
        expect(hostUserIds).toContain(userAdmin.id);

        await eventTypesRepositoryFixture.delete(createdEventType.data.id);
      });

      it("should change round robin event type to collective with assignAllTeamMembers: true", async () => {
        const createBody: CreateTeamEventTypeInput_2024_06_14 = {
          title: `teams-event-types-scheduling-roundrobin-${randomString()}`,
          slug: `teams-event-types-scheduling-roundrobin-${randomString()}`,
          description: "Test round robin event type",
          lengthInMinutes: 60,
          locations: [
            {
              type: "integration",
              integration: "cal-video",
            },
          ],
          schedulingType: "ROUND_ROBIN",
          hosts: [
            {
              userId: teamMember1.id,
              priority: "high",
            },
          ],
        };

        const createResponse = await request(app.getHttpServer())
          .post(`/v2/teams/${team.id}/event-types`)
          .send(createBody)
          .expect(201);

        const createdEventType: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = createResponse.body;

        const updateBody = {
          schedulingType: "collective",
          assignAllTeamMembers: true,
        };

        const updateResponse = await request(app.getHttpServer())
          .patch(`/v2/teams/${team.id}/event-types/${createdEventType.data.id}`)
          .send(updateBody)
          .expect(200);

        const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = updateResponse.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data.schedulingType).toEqual("collective");
        expect(responseBody.data.hosts).toHaveLength(3);
        const hostUserIds = responseBody.data.hosts.map((host) => host.userId);
        expect(hostUserIds).toContain(teamMember1.id);
        expect(hostUserIds).toContain(teamMember2.id);
        expect(hostUserIds).toContain(userAdmin.id);

        await eventTypesRepositoryFixture.delete(createdEventType.data.id);
      });

      it("should preserve existing hosts when updating without changing scheduling type", async () => {
        const createBody = {
          title: `teams-event-types-scheduling-preserve-${randomString()}`,
          slug: `teams-event-types-scheduling-preserve-${randomString()}`,
          description: "Test preserve hosts",
          lengthInMinutes: 60,
          locations: [
            {
              type: "integration",
              integration: "cal-video",
            },
          ],
          schedulingType: "collective",
          hosts: [
            {
              userId: teamMember1.id,
            },
            {
              userId: teamMember2.id,
            },
          ],
        };

        const createResponse = await request(app.getHttpServer())
          .post(`/v2/teams/${team.id}/event-types`)
          .send(createBody)
          .expect(201);

        const createdEventType: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = createResponse.body;

        const updateBody = {
          title: "Updated title",
        };

        const updateResponse = await request(app.getHttpServer())
          .patch(`/v2/teams/${team.id}/event-types/${createdEventType.data.id}`)
          .send(updateBody)
          .expect(200);

        const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = updateResponse.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data.title).toEqual("Updated title");
        expect(responseBody.data.schedulingType).toEqual("collective");
        expect(responseBody.data.hosts).toHaveLength(2);
        expect(responseBody.data.hosts.map((h) => h.userId)).toContain(teamMember1.id);
        expect(responseBody.data.hosts.map((h) => h.userId)).toContain(teamMember2.id);

        await eventTypesRepositoryFixture.delete(createdEventType.data.id);
      });
    });

    describe("should update event type title", () => {
      it("should preserve hosts when updating collective event type title", async () => {
        const collectiveEventType = await eventTypesRepositoryFixture.create(
          {
            title: `collective-preserve-hosts-${randomString()}`,
            slug: `collective-preserve-hosts-${randomString()}`,
            length: 60,
            team: {
              connect: {
                id: team.id,
              },
            },
            schedulingType: "COLLECTIVE",
            hosts: {
              create: [
                {
                  userId: teamMember1.id,
                  isFixed: true,
                },
                {
                  userId: teamMember2.id,
                  isFixed: true,
                },
              ],
            },
          },
          userAdmin.id
        );

        const newTitle = `updated-collective-title-${randomString()}`;
        const updateBody = {
          title: newTitle,
        };

        const response = await request(app.getHttpServer())
          .patch(`/v2/teams/${team.id}/event-types/${collectiveEventType.id}`)
          .send(updateBody)
          .expect(200);

        const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data.title).toEqual(newTitle);
        expect(responseBody.data.schedulingType).toEqual("collective");
        expect(responseBody.data.hosts).toHaveLength(2);
        expect(responseBody.data.hosts.map((h) => h.userId)).toContain(teamMember1.id);
        expect(responseBody.data.hosts.map((h) => h.userId)).toContain(teamMember2.id);

        await eventTypesRepositoryFixture.delete(collectiveEventType.id);
      });

      it("should preserve hosts when updating round robin event type title", async () => {
        const roundRobinEventType = await eventTypesRepositoryFixture.create(
          {
            title: `roundrobin-preserve-hosts-${randomString()}`,
            slug: `roundrobin-preserve-hosts-${randomString()}`,
            length: 60,
            team: {
              connect: {
                id: team.id,
              },
            },
            schedulingType: "ROUND_ROBIN",
            hosts: {
              create: [
                {
                  userId: teamMember1.id,
                  isFixed: false,
                  priority: 2,
                },
                {
                  userId: teamMember2.id,
                  isFixed: true,
                  priority: 1,
                },
              ],
            },
          },
          userAdmin.id
        );

        const newTitle = `updated-roundrobin-title-${randomString()}`;
        const updateBody = {
          title: newTitle,
        };

        const response = await request(app.getHttpServer())
          .patch(`/v2/teams/${team.id}/event-types/${roundRobinEventType.id}`)
          .send(updateBody)
          .expect(200);

        const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data.title).toEqual(newTitle);
        expect(responseBody.data.schedulingType).toEqual("roundRobin");
        expect(responseBody.data.hosts).toHaveLength(2);
        expect(responseBody.data.hosts.map((h) => h.userId)).toContain(teamMember1.id);
        expect(responseBody.data.hosts.map((h) => h.userId)).toContain(teamMember2.id);

        await eventTypesRepositoryFixture.delete(roundRobinEventType.id);
      });
    });

    describe("should update event type hosts", () => {
      it("should update collective event type hosts", async () => {
        const collectiveEventType = await eventTypesRepositoryFixture.create(
          {
            title: `collective-update-hosts-${randomString()}`,
            slug: `collective-update-hosts-${randomString()}`,
            length: 60,
            team: {
              connect: {
                id: team.id,
              },
            },
            schedulingType: "COLLECTIVE",
            hosts: {
              create: [
                {
                  userId: teamMember1.id,
                  isFixed: true,
                },
              ],
            },
          },
          userAdmin.id
        );

        const updateBody = {
          hosts: [
            {
              userId: teamMember2.id,
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .patch(`/v2/teams/${team.id}/event-types/${collectiveEventType.id}`)
          .send(updateBody)
          .expect(200);

        const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data.schedulingType).toEqual("collective");
        expect(responseBody.data.hosts).toHaveLength(1);
        expect(responseBody.data.hosts[0].userId).toEqual(teamMember2.id);

        await eventTypesRepositoryFixture.delete(collectiveEventType.id);
      });

      it("should update round robin event type hosts", async () => {
        const roundRobinEventType = await eventTypesRepositoryFixture.create(
          {
            title: `roundrobin-update-hosts-${randomString()}`,
            slug: `roundrobin-update-hosts-${randomString()}`,
            length: 60,
            team: {
              connect: {
                id: team.id,
              },
            },
            schedulingType: "ROUND_ROBIN",
            hosts: {
              create: [
                {
                  userId: teamMember1.id,
                  isFixed: true,
                  priority: 1,
                },
              ],
            },
          },
          userAdmin.id
        );

        const updateBody = {
          hosts: [
            {
              userId: teamMember2.id,
              priority: "high",
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .patch(`/v2/teams/${team.id}/event-types/${roundRobinEventType.id}`)
          .send(updateBody)
          .expect(200);

        const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data.schedulingType).toEqual("roundRobin");
        expect(responseBody.data.hosts).toHaveLength(1);
        expect(responseBody.data.hosts[0].userId).toEqual(teamMember2.id);

        await eventTypesRepositoryFixture.delete(roundRobinEventType.id);
      });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(userAdmin.email);
      await userRepositoryFixture.deleteByEmail(teamMember1.email);
      await userRepositoryFixture.deleteByEmail(teamMember2.email);
      await userRepositoryFixture.deleteByEmail(falseTestUser.email);
      await teamsRepositoryFixture.delete(team.id);
      await teamsRepositoryFixture.delete(falseTestTeam.id);
      await app.close();
    });
  });
});
