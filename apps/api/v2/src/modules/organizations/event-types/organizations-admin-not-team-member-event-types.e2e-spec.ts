import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_06_14 } from "@calcom/platform-constants";
import {
  BookingWindowPeriodInputTypeEnum_2024_06_14,
  BookerLayoutsInputEnum_2024_06_14,
  ConfirmationPolicyEnum,
  NoticeThresholdUnitEnum,
} from "@calcom/platform-enums";
import { SchedulingType } from "@calcom/platform-libraries";
import type {
  ApiSuccessResponse,
  CreateTeamEventTypeInput_2024_06_14,
  EventTypeOutput_2024_06_14,
  Host,
  TeamEventTypeOutput_2024_06_14,
  UpdateTeamEventTypeInput_2024_06_14,
} from "@calcom/platform-types";
import type { User, Team } from "@calcom/prisma/client";

describe("Organizations Event Types Endpoints", () => {
  describe("User Authentication - User is Org Admin but not team admin", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;

    let org: Team;
    let team: Team;
    let falseTestOrg: Team;
    let falseTestTeam: Team;

    const userEmail = `organizations-event-types-admin-${randomString()}@api.com`;
    let userAdmin: User;

    const teammate1Email = `organizations-event-types-teammate1-${randomString()}@api.com`;
    const teammate2Email = `organizations-event-types-teammate2-${randomString()}@api.com`;
    const falseTestUserEmail = `organizations-event-types-false-user-${randomString()}@api.com`;
    let teammate1: User;
    let teammate2: User;
    let falseTestUser: User;

    let collectiveEventType: TeamEventTypeOutput_2024_06_14;
    let managedEventType: TeamEventTypeOutput_2024_06_14;

    const managedEventTypeSlug = `organizations-event-types-managed-${randomString()}`;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

      userAdmin = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        role: "ADMIN",
      });

      teammate1 = await userRepositoryFixture.create({
        email: teammate1Email,
        username: teammate1Email,
        name: "alice",
      });

      teammate2 = await userRepositoryFixture.create({
        email: teammate2Email,
        username: teammate2Email,
        name: "bob",
      });

      falseTestUser = await userRepositoryFixture.create({
        email: falseTestUserEmail,
        username: falseTestUserEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: `organizations-event-types-organization-${randomString()}`,
        isOrganization: true,
        slug: `organizations-event-types-organization-${randomString()}`,
      });

      falseTestOrg = await organizationsRepositoryFixture.create({
        name: `organizations-event-types-false-org-${randomString()}`,
        isOrganization: true,
      });

      team = await teamsRepositoryFixture.create({
        name: `organizations-event-types-team-${randomString()}`,
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      falseTestTeam = await teamsRepositoryFixture.create({
        name: `organizations-event-types-false-team-${randomString()}`,
        isOrganization: false,
        parent: { connect: { id: falseTestOrg.id } },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${userAdmin.id}`,
        username: userEmail,
        organization: {
          connect: {
            id: org.id,
          },
        },
        user: {
          connect: {
            id: userAdmin.id,
          },
        },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${teammate1.id}`,
        username: teammate1Email,
        organization: {
          connect: {
            id: org.id,
          },
        },
        user: {
          connect: {
            id: teammate1.id,
          },
        },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${teammate2.id}`,
        username: teammate2Email,
        organization: {
          connect: {
            id: org.id,
          },
        },
        user: {
          connect: {
            id: teammate2.id,
          },
        },
      });

      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: userAdmin.id } },
        team: { connect: { id: org.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teammate1.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teammate2.id } },
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

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(organizationsRepositoryFixture).toBeDefined();
      expect(userAdmin).toBeDefined();
      expect(org).toBeDefined();
    });

    it("should not be able to create event-type for team outside org", async () => {
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
          {
            type: "organizersDefaultApp",
          },
        ],
        schedulingType: "COLLECTIVE",
        hosts: [
          {
            userId: teammate1.id,
            mandatory: true,
            priority: "high",
          },
        ],
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams/${falseTestTeam.id}/event-types`)
        .send(body)
        .expect(404);
    });

    it("should not be able to create event-type for user outside org", async () => {
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

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams/${team.id}/event-types`)
        .send(body)
        .expect(404);
    });

    it("should create a collective team event-type", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        successRedirectUrl: "https://masterchief.com/argentina/flan/video/1234",
        title: "Coding consultation collective",
        slug: `organizations-event-types-collective-${randomString()}`,
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
        // @ts-ignore
        schedulingType: "collective",
        hosts: [
          {
            userId: teammate1.id,
          },
          {
            userId: teammate2.id,
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
        .post(`/v2/organizations/${org.id}/teams/${team.id}/event-types`)
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
          expect(data.successRedirectUrl).toEqual("https://masterchief.com/argentina/flan/video/1234");
          collectiveEventType = responseBody.data;
        });
    });

    it("should create a managed team event-type", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: "Coding consultation managed",
        slug: managedEventTypeSlug,
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
            userId: teammate1.id,
            mandatory: true,
            priority: "high",
          },
          {
            userId: teammate2.id,
            mandatory: false,
            priority: "low",
          },
        ],
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams/${team.id}/event-types`)
        .send(body)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.length).toEqual(3);

          const teammate1EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teammate1.id);
          const teammate2EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teammate2.id);
          const teamEventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(team.id);

          expect(teammate1EventTypes.length).toEqual(1);
          expect(teammate1EventTypes[0].slug).toEqual(managedEventTypeSlug);
          expect(teammate2EventTypes.length).toEqual(1);
          expect(teammate2EventTypes[0].slug).toEqual(managedEventTypeSlug);
          expect(teamEventTypes.filter((eventType) => eventType.schedulingType === "MANAGED").length).toEqual(
            1
          );

          const responseTeamEvent = responseBody.data.find((event) => event.teamId === team.id);
          expect(responseTeamEvent).toBeDefined();
          expect(responseTeamEvent?.hosts?.find((host) => host.userId === teammate1.id)).toEqual({
            userId: teammate1.id,
            name: teammate1.name,
            username: teammate1.username,
            avatarUrl: teammate1.avatarUrl,
          });

          expect(responseTeamEvent?.hosts?.find((host) => host.userId === teammate2.id)).toEqual({
            userId: teammate2.id,
            name: teammate2.name,
            username: teammate2.username,
            avatarUrl: teammate2.avatarUrl,
          });

          if (!responseTeamEvent) {
            throw new Error("Team event not found");
          }

          const responseTeammate1Event = responseBody.data.find((event) => event.ownerId === teammate1.id);
          expect(responseTeammate1Event).toBeDefined();
          expect(responseTeammate1Event?.parentEventTypeId).toEqual(responseTeamEvent?.id);

          const responseTeammate2Event = responseBody.data.find((event) => event.ownerId === teammate2.id);
          expect(responseTeammate2Event).toBeDefined();
          expect(responseTeammate2Event?.parentEventTypeId).toEqual(responseTeamEvent?.id);

          managedEventType = responseTeamEvent;
        });
    });

    it("managed team event types should be returned when fetching event types of users", async () => {
      return request(app.getHttpServer())
        .get(`/v2/event-types?username=${teammate1.username}&orgSlug=${org.slug}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.length).toEqual(1);
          expect(data[0].slug).toEqual(managedEventTypeSlug);
          expect(data[0].ownerId).toEqual(teammate1.id);
          expect(data[0].id).not.toEqual(managedEventType.id);
        });
    });

    it("managed team event type should be returned when fetching event types of users", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/event-types?username=${teammate1.username}&orgSlug=${org.slug}&eventSlug=${managedEventTypeSlug}`
        )
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.length).toEqual(1);
          expect(data[0].slug).toEqual(managedEventTypeSlug);
          expect(data[0].ownerId).toEqual(teammate1.id);
          expect(data[0].id).not.toEqual(managedEventType.id);
        });
    });

    it("should not get an event-type of team outside org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${falseTestTeam.id}/event-types/${collectiveEventType.id}`)
        .expect(404);
    });

    it("should not get a non existing event-type", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${team.id}/event-types/999999`)
        .expect(404);
    });

    it("should get a team event-type", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${collectiveEventType.id}`)
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

    it("should not get event-types of team outside org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${falseTestTeam.id}/event-types`)
        .expect(404);
    });

    it("should get team event-types", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${team.id}/event-types`)
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

    it("should not be able to update event-type for incorrect team", async () => {
      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        title: "Clean code consultation",
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${falseTestTeam.id}/event-types/${collectiveEventType.id}`)
        .send(body)
        .expect(404);
    });

    it("should not be able to update non existing event-type", async () => {
      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        title: "Clean code consultation",
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${team.id}/event-types/999999`)
        .send(body)
        .expect(400);
    });

    it("should update collective event-type", async () => {
      const newHosts: UpdateTeamEventTypeInput_2024_06_14["hosts"] = [
        {
          userId: teammate1.id,
        },
      ];

      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        hosts: newHosts,
        successRedirectUrl: "https://new-url-success.com",
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${collectiveEventType.id}`)
        .send(body)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const eventType = responseBody.data;
          expect(eventType.successRedirectUrl).toEqual("https://new-url-success.com");
          expect(eventType.title).toEqual(collectiveEventType.title);
          expect(eventType.hosts.length).toEqual(1);
          evaluateHost(eventType.hosts[0], newHosts[0]);
        });
    });

    it("should update managed event-type", async () => {
      const newTitle = "Coding consultation managed updated";
      const newHosts: UpdateTeamEventTypeInput_2024_06_14["hosts"] = [
        {
          userId: teammate1.id,
          mandatory: true,
          priority: "medium",
        },
      ];

      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        title: newTitle,
        hosts: newHosts,
        successRedirectUrl: "https://new-url-success-managed.com",
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${managedEventType.id}`)
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.length).toEqual(2);

          const teammate1EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teammate1.id);
          const teammate2EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teammate2.id);
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
            (eventType) => eventType.ownerId === teammate1.id
          );
          expect(responseTeammate1Event).toBeDefined();
          expect(responseTeammate1Event?.title).toEqual(newTitle);

          managedEventType = responseBody.data[0];
          expect(managedEventType.successRedirectUrl).toEqual("https://new-url-success-managed.com");
        });
    });

    it("should be able to create phone-only event type", async () => {
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
            userId: teammate1.id,
            mandatory: true,
            priority: "high",
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

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams/${team.id}/event-types`)
        .send(body)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data;
          expect(data.bookingFields).toEqual([
            {
              isDefault: true,
              type: "name",
              slug: "name",
              label: "your_name",
              required: true,
              disableOnPrefill: false,
            },
            {
              isDefault: true,
              type: "email",
              slug: "email",
              required: false,
              label: "Email",
              disableOnPrefill: false,
              hidden: true,
            },
            {
              isDefault: true,
              type: "radioInput",
              slug: "location",
              required: false,
              hidden: false,
            },
            {
              isDefault: true,
              type: "phone",
              slug: "attendeePhoneNumber",
              required: true,
              hidden: false,
              label: "Phone number",
              disableOnPrefill: false,
            },
            {
              isDefault: true,
              type: "text",
              slug: "title",
              required: true,
              disableOnPrefill: false,
              hidden: true,
            },
            {
              isDefault: true,
              type: "textarea",
              slug: "notes",
              required: false,
              disableOnPrefill: false,
              hidden: false,
            },
            {
              isDefault: true,
              type: "multiemail",
              slug: "guests",
              required: false,
              disableOnPrefill: false,
              hidden: false,
            },
            {
              isDefault: true,
              type: "textarea",
              slug: "rescheduleReason",
              required: false,
              disableOnPrefill: false,
              hidden: false,
            },
          ]);
        });
    });

    it("should be able to configure phone-only event type", async () => {
      const body: UpdateTeamEventTypeInput_2024_06_14 = {
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

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${collectiveEventType.id}`)
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const data = responseBody.data;
          expect(data.bookingFields).toEqual([
            {
              isDefault: true,
              type: "name",
              slug: "name",
              required: true,
              label: "your_name",
              disableOnPrefill: false,
            },
            {
              isDefault: true,
              type: "email",
              slug: "email",
              required: false,
              label: "Email",
              disableOnPrefill: false,
              hidden: true,
            },
            {
              isDefault: true,
              type: "radioInput",
              slug: "location",
              required: false,
              hidden: false,
            },
            {
              isDefault: true,
              type: "phone",
              slug: "attendeePhoneNumber",
              required: true,
              hidden: false,
              label: "Phone number",
              disableOnPrefill: false,
            },
            {
              isDefault: true,
              type: "text",
              slug: "title",
              required: true,
              disableOnPrefill: false,
              hidden: true,
            },
            {
              isDefault: true,
              type: "textarea",
              slug: "notes",
              required: false,
              disableOnPrefill: false,
              hidden: false,
            },
            {
              isDefault: true,
              type: "multiemail",
              slug: "guests",
              required: false,
              disableOnPrefill: false,
              hidden: false,
            },
            {
              isDefault: true,
              type: "textarea",
              slug: "rescheduleReason",
              required: false,
              disableOnPrefill: false,
              hidden: false,
            },
          ]);
        });
    });

    it("should assign all members to managed event-type", async () => {
      const body: UpdateTeamEventTypeInput_2024_06_14 = {
        assignAllTeamMembers: true,
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${managedEventType.id}`)
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.length).toEqual(3);

          const teammate1EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teammate1.id);
          const teammate2EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teammate2.id);
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
            (eventType) => eventType.ownerId === teammate1.id
          );
          expect(responseTeammate1Event).toBeDefined();
          expect(responseTeammate1Event?.parentEventTypeId).toEqual(responseTeamEvent?.id);

          const responseTeammate2Event = responseBody.data.find(
            (eventType) => eventType.ownerId === teammate2.id
          );
          expect(responseTeammate1Event).toBeDefined();
          expect(responseTeammate2Event?.parentEventTypeId).toEqual(responseTeamEvent?.id);

          if (responseTeamEvent) {
            managedEventType = responseTeamEvent;
          }
        });
    });

    it("should not delete event-type of team outside org", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/teams/${falseTestTeam.id}/event-types/${collectiveEventType.id}`)
        .expect(404);
    });

    it("should delete event-type not part of the team", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/teams/${team.id}/event-types/99999`)
        .expect(404);
    });

    it("should delete collective event-type", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${collectiveEventType.id}`)
        .expect(200);
    });

    it("should delete managed event-type", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${managedEventType.id}`)
        .expect(200);
    });

    it("should return event type with default bookingFields if they are not defined", async () => {
      const eventTypeInput = {
        title: "unknown field event type two",
        slug: `organizations-event-types-unknown-${randomString()}`,
        description: "unknown field event type description two",
        length: 40,
        hidden: false,
        locations: [],
        schedulingType: SchedulingType.ROUND_ROBIN,
      };
      const eventType = await eventTypesRepositoryFixture.createTeamEventType({
        ...eventTypeInput,
        team: { connect: { id: team.id } },
      });

      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${team.id}/event-types/${eventType.id}`)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          const fetchedEventType = responseBody.data;

          expect(fetchedEventType.bookingFields).toEqual([
            { isDefault: true, required: true, slug: "name", type: "name", disableOnPrefill: false },
            {
              isDefault: true,
              required: true,
              slug: "email",
              type: "email",
              disableOnPrefill: false,
              hidden: false,
            },
            {
              disableOnPrefill: false,
              isDefault: true,
              type: "phone",
              slug: "attendeePhoneNumber",
              required: false,
              hidden: true,
            },
            {
              isDefault: true,
              type: "radioInput",
              slug: "location",
              required: false,
              hidden: false,
            },
            {
              isDefault: true,
              required: true,
              slug: "title",
              type: "text",
              disableOnPrefill: false,
              hidden: true,
            },
            {
              isDefault: true,
              required: false,
              slug: "notes",
              type: "textarea",
              disableOnPrefill: false,
              hidden: false,
            },
            {
              isDefault: true,
              required: false,
              slug: "guests",
              type: "multiemail",
              disableOnPrefill: false,
              hidden: false,
            },
            {
              isDefault: true,
              required: false,
              slug: "rescheduleReason",
              type: "textarea",
              disableOnPrefill: false,
              hidden: false,
            },
          ]);
        });
    });

    it("should create a round robin team event-type", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        successRedirectUrl: "https://masterchief.com/argentina/flan/video/1234",
        title: "Coding consultation round robin",
        slug: `organizations-event-types-round-robin-${randomString()}`,
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
        // @ts-ignore
        schedulingType: "roundRobin",
        hosts: [
          {
            userId: teammate1.id,
            mandatory: true,
            priority: "high",
          },
          {
            userId: teammate2.id,
            mandatory: false,
            priority: "medium",
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
        .post(`/v2/organizations/${org.id}/teams/${team.id}/event-types`)
        .send(body)
        .expect(201)
        .then((response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.title).toEqual(body.title);
          expect(data.hosts.length).toEqual(2);
          expect(data.schedulingType).toEqual("roundRobin");
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
          expect(data.successRedirectUrl).toEqual("https://masterchief.com/argentina/flan/video/1234");
          collectiveEventType = responseBody.data;
        });
    });

    it("should create a managed team event-type without hosts", async () => {
      const body: CreateTeamEventTypeInput_2024_06_14 = {
        title: "Coding consultation managed without hosts",
        slug: "coding-consultation-managed-without-hosts",
        description: "Our team will review your codebase.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "cal-video",
          },
        ],
        schedulingType: "MANAGED",
      };

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams/${team.id}/event-types`)
        .send(body)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<TeamEventTypeOutput_2024_06_14[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          const data = responseBody.data;
          expect(data.length).toEqual(1);

          const teammate1EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teammate1.id);
          const teammate2EventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(teammate2.id);
          const teamEventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(team.id);

          const teammate1HasThisEvent = teammate1EventTypes.some((eventType) => eventType.slug === body.slug);
          const teammate2HasThisEvent = teammate2EventTypes.some((eventType) => eventType.slug === body.slug);
          expect(teammate1HasThisEvent).toBe(false);
          expect(teammate2HasThisEvent).toBe(false);
          expect(
            teamEventTypes.filter(
              (eventType) => eventType.schedulingType === "MANAGED" && eventType.slug === body.slug
            ).length
          ).toEqual(1);

          const responseTeamEvent = responseBody.data.find((event) => event.teamId === team.id);
          expect(responseTeamEvent).toBeDefined();
          expect(responseTeamEvent?.hosts).toEqual([]);

          if (!responseTeamEvent) {
            throw new Error("Team event not found");
          }
        });
    });

    function evaluateHost(expected: Host, received: Host | undefined) {
      expect(expected.userId).toEqual(received?.userId);
      expect(expected.mandatory).toEqual(received?.mandatory);
      expect(expected.priority).toEqual(received?.priority);
    }

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(userAdmin.email);
      await userRepositoryFixture.deleteByEmail(teammate1.email);
      await userRepositoryFixture.deleteByEmail(teammate2.email);
      await userRepositoryFixture.deleteByEmail(falseTestUser.email);
      await teamsRepositoryFixture.delete(team.id);
      await teamsRepositoryFixture.delete(falseTestTeam.id);
      await organizationsRepositoryFixture.delete(org.id);
      await organizationsRepositoryFixture.delete(falseTestOrg.id);
      await app.close();
    });
  });
});
