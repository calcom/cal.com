import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateEventTypeInput_2024_04_15 } from "@/ee/event-types/event-types_2024_04_15/inputs/create-event-type.input";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { SchedulesRepositoryFixture } from "test/fixtures/repository/schedules.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";



import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_06_14 } from "@calcom/platform-constants";
import { BookingWindowPeriodInputTypeEnum_2024_06_14, BookerLayoutsInputEnum_2024_06_14, ConfirmationPolicyEnum, NoticeThresholdUnitEnum, FrequencyInput } from "@calcom/platform-enums";
import { SchedulingType } from "@calcom/platform-libraries";
import { type ApiSuccessResponse, type CreateEventTypeInput_2024_06_14, type EventTypeOutput_2024_06_14, type GuestsDefaultFieldOutput_2024_06_14, type NameDefaultFieldInput_2024_06_14, type NotesDefaultFieldInput_2024_06_14, type SplitNameDefaultFieldOutput_2024_06_14, type UpdateEventTypeInput_2024_06_14 } from "@calcom/platform-types";
import { FAILED_RECURRING_EVENT_TYPE_WITH_BOOKER_LIMITS_ERROR_MESSAGE } from "@calcom/platform-types/event-types/event-types_2024_06_14/inputs/validators/CantHaveRecurrenceAndBookerActiveBookingsLimit";
import { REQUIRES_AT_LEAST_ONE_PROPERTY_ERROR } from "@calcom/platform-types/utils/RequiresOneOfPropertiesWhenNotDisabled";
import type { PlatformOAuthClient, Team, User, Schedule, EventType } from "@calcom/prisma/client";


const orderBySlug = (a: { slug: string }, b: { slug: string }) => {
  if (a.slug < b.slug) return -1;
  if (a.slug > b.slug) return 1;
  return 0;
};

describe("Event types Endpoints", () => {
  describe("Not authenticated", () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter],
        imports: [AppModule, UsersModule, EventTypesModule_2024_06_14, TokensModule],
      })
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    it(`/GET/:id`, () => {
      return request(app.getHttpServer()).get("/api/v2/event-types/100").expect(401);
    });

    afterAll(async () => {
      await app.close();
    });
  });

  describe("User Authenticated", () => {
    let app: INestApplication;

    let oAuthClient: PlatformOAuthClient;
    let organization: Team;
    let userRepositoryFixture: UserRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let schedulesRepostoryFixture: SchedulesRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
    let apiKeyString: string;
    let apiKeyOrgUser: string;

    const userEmail = `event-types-2024-06-14-user-${randomString()}@api.com`;
    const falseTestEmail = `event-types-2024-06-14-false-user-${randomString()}@api.com`;
    const name = `event-types-2024-06-14-user-${randomString()}`;
    const username = name;
    let eventType: EventTypeOutput_2024_06_14;
    let hiddenEventType: EventTypeOutput_2024_06_14;
    let user: User;
    let orgUser: User;
    let falseTestUser: User;
    let firstSchedule: Schedule;
    let secondSchedule: Schedule;
    let falseTestSchedule: Schedule;
    let orgUserEventType1: EventType;
    let orgUserEventType2: EventType;
    let orgUserEventType3: EventType;

    const defaultResponseBookingFieldName = {
      isDefault: true,
      type: "name",
      slug: "name",
      required: true,
      disableOnPrefill: false,
    };

    const defaultResponseBookingFieldEmail = {
      isDefault: true,
      type: "email",
      slug: "email",
      required: true,
      disableOnPrefill: false,
      hidden: false,
    };

    const defaultResponseBookingFieldLocation = {
      isDefault: true,
      type: "radioInput",
      slug: "location",
      required: false,
      hidden: false,
    };

    const defaultResponseBookingFieldTitle = {
      isDefault: true,
      type: "text",
      slug: "title",
      required: true,
      hidden: true,
      disableOnPrefill: false,
    };

    const defaultResponseBookingFieldNotes = {
      isDefault: true,
      type: "textarea",
      slug: "notes",
      required: false,
      hidden: false,
      disableOnPrefill: false,
    };

    const defaultResponseBookingFieldGuests = {
      isDefault: true,
      type: "multiemail",
      slug: "guests",
      required: false,
      hidden: false,
      disableOnPrefill: false,
    };

    const defaultResponseBookingFieldRescheduleReason = {
      isDefault: true,
      type: "textarea",
      slug: "rescheduleReason",
      required: false,
      hidden: false,
      disableOnPrefill: false,
    };

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter],
        imports: [AppModule, UsersModule, EventTypesModule_2024_06_14, TokensModule],
      })
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      schedulesRepostoryFixture = new SchedulesRepositoryFixture(moduleRef);
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      organization = await teamRepositoryFixture.create({
        name: `event-types-2024-06-14-organization-${randomString()}`,
        slug: `event-type-2024-06-14-org-slug-${randomString()}`,
      });
      oAuthClient = await createOAuthClient(organization.id);
      user = await userRepositoryFixture.create({
        email: userEmail,
        name,
        username,
      });
      apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
      const { keyString } = await apiKeysRepositoryFixture.createApiKey(user.id, null);
      apiKeyString = `cal_test_${keyString}`;

      orgUser = await userRepositoryFixture.create({
        email: `event-types-2024-06-14-org-user-${randomString()}@example.com`,
        name: `event-types-2024-06-14-org-user-${randomString()}`,
        username: `event-types-2024-06-14-org-user-${randomString()}`,
      });
      const { keyString: orgUserApiKeyString } = await apiKeysRepositoryFixture.createApiKey(
        orgUser.id,
        null
      );
      apiKeyOrgUser = `cal_test_${orgUserApiKeyString}`;

      profileRepositoryFixture.create({
        uid: `usr-${orgUser.id}`,
        username: orgUser.username as string,
        organization: {
          connect: {
            id: organization.id,
          },
        },
        user: {
          connect: {
            id: orgUser.id,
          },
        },
      });

      orgUserEventType1 = await eventTypesRepositoryFixture.create(
        {
          title: `event-types-2024-06-14-event-type-${randomString()}`,
          slug: `event-types-2024-06-14-event-type-${randomString()}`,
          length: 60,
          locations: [],
        },
        orgUser.id
      );

      orgUserEventType2 = await eventTypesRepositoryFixture.create(
        {
          title: `event-types-2024-06-14-event-type-${randomString()}`,
          slug: `event-types-2024-06-14-event-type-${randomString()}`,
          length: 60,
          locations: [],
        },
        orgUser.id
      );

      orgUserEventType3 = await eventTypesRepositoryFixture.create(
        {
          title: `event-types-2024-06-14-event-type-${randomString()}`,
          slug: `event-types-2024-06-14-event-type-${randomString()}`,
          length: 60,
          locations: [],
        },
        orgUser.id
      );

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: orgUser.id } },
        team: { connect: { id: organization.id } },
        accepted: true,
      });

      falseTestUser = await userRepositoryFixture.create({
        email: falseTestEmail,
        name: `event-types-2024-06-14-false-test-user-${randomString()}`,
        username: falseTestEmail,
      });

      firstSchedule = await schedulesRepostoryFixture.create({
        userId: user.id,
        name: `event-types-2024-06-14-schedule-work-${randomString()}`,
        timeZone: "Europe/Rome",
      });

      secondSchedule = await schedulesRepostoryFixture.create({
        userId: user.id,
        name: `event-types-2024-06-14-schedule-chill-${randomString()}`,
        timeZone: "Europe/Rome",
      });

      falseTestSchedule = await schedulesRepostoryFixture.create({
        userId: falseTestUser.id,
        name: `event-types-2024-06-14-schedule-work-${randomString()}`,
        timeZone: "Europe/Rome",
      });

      await app.init();
    });

    async function createOAuthClient(organizationId: number) {
      const data = {
        logo: "logo-url",
        name: "name",
        redirectUris: ["redirect-uri"],
        permissions: 32,
      };
      const secret = "secret";

      const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
      return client;
    }

    it("should be defined", () => {
      expect(oauthClientRepositoryFixture).toBeDefined();
      expect(userRepositoryFixture).toBeDefined();
      expect(oAuthClient).toBeDefined();
      expect(user).toBeDefined();
    });

    it("should not allow creating an event type with schedule user does not own", async () => {
      const scheduleId = falseTestSchedule.id;

      const body: CreateEventTypeInput_2024_06_14 = {
        title: "Coding class",
        slug: "coding-class",
        description: "Let's learn how to code like a pro.",
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
            label: "select which language you want to learn",
            slug: "select-language",
            required: true,
            placeholder: "select language",
            options: ["javascript", "python", "cobol"],
          },
        ],
        scheduleId,
      };

      return request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .send(body)
        .expect(404);
    });

    it("should not be able to create phone-only event type", async () => {
      const body: CreateEventTypeInput_2024_06_14 = {
        title: "Phone coding consultation",
        slug: "phone-coding-consultation",
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
        .post("/api/v2/event-types")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .send(body)
        .expect(400);

      expect(response.body.error.message).toBe(
        "checkIsEmailUserAccessible - Email booking field must be required and visible"
      );
    });

    it("should not allow creating an event type with integration not installed on user", async () => {
      const body: CreateEventTypeInput_2024_06_14 = {
        title: "Coding class",
        slug: "coding-class",
        description: "Let's learn how to code like a pro.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "zoom",
          },
        ],
      };

      return request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .send(body)
        .expect(400);
    });

    it("should create an event type", async () => {
      const nameBookingField: NameDefaultFieldInput_2024_06_14 = {
        type: "name",
        label: "Your name sir / madam",
        placeholder: "john doe",
        disableOnPrefill: false,
      };

      const body: CreateEventTypeInput_2024_06_14 = {
        title: "Coding class",
        slug: "coding-class",
        description: "Let's learn how to code like a pro.",
        lengthInMinutes: 60,
        lengthInMinutesOptions: [30, 60, 90],
        locations: [
          {
            type: "integration",
            integration: "cal-video",
          },
          {
            type: "attendeePhone",
          },
          {
            type: "attendeeAddress",
          },
          {
            type: "attendeeDefined",
          },
        ],
        bookingFields: [
          nameBookingField,
          {
            type: "select",
            label: "select which language you want to learn",
            slug: "select-language",
            required: true,
            placeholder: "select language",
            options: ["javascript", "python", "cobol"],
            disableOnPrefill: true,
            hidden: false,
          },
          {
            type: "url",
            label: "Video Url",
            slug: "video-url",
            required: true,
            placeholder: "add video url",
            disableOnPrefill: true,
            hidden: false,
          },
        ],
        scheduleId: firstSchedule.id,
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
        recurrence: {
          frequency: FrequencyInput.weekly,
          interval: 2,
          occurrences: 10,
          disabled: false,
        },
        requiresBookerEmailVerification: false,
        hideCalendarNotes: false,
        hideCalendarEventDetails: false,
        hideOrganizerEmail: false,
        lockTimeZoneToggleOnBookingPage: true,
        color: {
          darkThemeHex: "#292929",
          lightThemeHex: "#fafafa",
        },
        customName: `{Event type title} between {Organiser} and {Scheduler}`,
        bookingRequiresAuthentication: true,
      };

      return request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .send(body)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
          const createdEventType = responseBody.data;
          expect(createdEventType).toHaveProperty("id");
          expect(createdEventType.title).toEqual(body.title);
          expect(createdEventType.description).toEqual(body.description);
          expect(createdEventType.lengthInMinutes).toEqual(body.lengthInMinutes);
          expect(createdEventType.lengthInMinutesOptions).toEqual(body.lengthInMinutesOptions);
          expect(createdEventType.locations).toEqual(body.locations);
          expect(createdEventType.ownerId).toEqual(user.id);
          expect(createdEventType.scheduleId).toEqual(firstSchedule.id);
          expect(createdEventType.bookingLimitsCount).toEqual(body.bookingLimitsCount);
          expect(createdEventType.onlyShowFirstAvailableSlot).toEqual(body.onlyShowFirstAvailableSlot);
          expect(createdEventType.bookingLimitsDuration).toEqual(body.bookingLimitsDuration);
          expect(createdEventType.offsetStart).toEqual(body.offsetStart);
          expect(createdEventType.bookingWindow).toEqual(body.bookingWindow);
          expect(createdEventType.bookerLayouts).toEqual(body.bookerLayouts);
          expect(createdEventType.confirmationPolicy).toEqual(body.confirmationPolicy);
          expect(createdEventType.recurrence).toEqual(body.recurrence);
          expect(createdEventType.customName).toEqual(body.customName);
          expect(createdEventType.requiresBookerEmailVerification).toEqual(
            body.requiresBookerEmailVerification
          );

          expect(createdEventType.hideCalendarNotes).toEqual(body.hideCalendarNotes);
          expect(createdEventType.hideCalendarEventDetails).toEqual(body.hideCalendarEventDetails);
          expect(createdEventType.hideOrganizerEmail).toEqual(body.hideOrganizerEmail);
          expect(createdEventType.lockTimeZoneToggleOnBookingPage).toEqual(
            body.lockTimeZoneToggleOnBookingPage
          );
          expect(createdEventType.color).toEqual(body.color);
          expect(createdEventType.disableGuests).toEqual(false);

          const expectedBookingFields = [
            { ...defaultResponseBookingFieldName, ...nameBookingField },
            { ...defaultResponseBookingFieldEmail },
            { ...defaultResponseBookingFieldLocation },
            {
              type: "select",
              label: "select which language you want to learn",
              slug: "select-language",
              required: true,
              placeholder: "select language",
              options: ["javascript", "python", "cobol"],
              disableOnPrefill: true,
              hidden: false,
              isDefault: false,
            },
            {
              type: "url",
              label: "Video Url",
              slug: "video-url",
              required: true,
              placeholder: "add video url",
              disableOnPrefill: true,
              hidden: false,
              isDefault: false,
            },
            { ...defaultResponseBookingFieldTitle },
            { ...defaultResponseBookingFieldNotes },
            { ...defaultResponseBookingFieldGuests },
            { ...defaultResponseBookingFieldRescheduleReason },
          ];

          expect(createdEventType.bookingFields).toEqual(expectedBookingFields);
          expect(createdEventType.bookingRequiresAuthentication).toEqual(true);
          eventType = responseBody.data;
        });
    });

    it("should create a hidden event type", async () => {
      const body: CreateEventTypeInput_2024_06_14 = {
        title: "Coding class hidden",
        slug: "coding-class-hidden",
        description: "Let's learn how to code like a pro.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "cal-video",
          },
        ],
        hidden: true,
      };

      const response = await request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .send(body)
        .expect(201);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
      const createdEventType = responseBody.data;
      expect(createdEventType).toHaveProperty("id");
      expect(createdEventType.title).toEqual(body.title);
      expect(createdEventType.hidden).toEqual(body.hidden);
      expect(createdEventType.ownerId).toEqual(user.id);
      hiddenEventType = responseBody.data;
    });

    it(`/GET/event-types by username`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types?username=${user.username}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(2);

      const fetchedEventType = responseBody.data?.find((et) => et.id === eventType.id);
      const fetchedHiddenEventType = responseBody.data?.find((et) => et.id === hiddenEventType.id);

      expect(fetchedEventType?.id).toEqual(eventType.id);
      expect(fetchedEventType?.title).toEqual(eventType.title);
      expect(fetchedEventType?.description).toEqual(eventType.description);
      expect(fetchedEventType?.lengthInMinutes).toEqual(eventType.lengthInMinutes);
      expect(fetchedEventType?.lengthInMinutesOptions).toEqual(eventType.lengthInMinutesOptions);
      expect(fetchedEventType?.locations).toEqual(eventType.locations);
      expect(fetchedEventType?.bookingFields.sort(orderBySlug)).toEqual(
        eventType.bookingFields.sort(orderBySlug).filter((f) => ("hidden" in f ? !f?.hidden : true))
      );
      expect(fetchedEventType?.ownerId).toEqual(user.id);
      expect(fetchedEventType?.bookingLimitsCount).toEqual(eventType.bookingLimitsCount);
      expect(fetchedEventType?.onlyShowFirstAvailableSlot).toEqual(eventType.onlyShowFirstAvailableSlot);
      expect(fetchedEventType?.bookingLimitsDuration).toEqual(eventType.bookingLimitsDuration);
      expect(fetchedEventType?.offsetStart).toEqual(eventType.offsetStart);
      expect(fetchedEventType?.bookingWindow).toEqual(eventType.bookingWindow);
      expect(fetchedEventType?.bookerLayouts).toEqual(eventType.bookerLayouts);
      expect(fetchedEventType?.confirmationPolicy).toEqual(eventType.confirmationPolicy);
      expect(fetchedEventType?.recurrence).toEqual(eventType.recurrence);
      expect(fetchedEventType?.customName).toEqual(eventType.customName);
      expect(fetchedEventType?.requiresBookerEmailVerification).toEqual(
        eventType.requiresBookerEmailVerification
      );
      expect(fetchedEventType?.hideCalendarNotes).toEqual(eventType.hideCalendarNotes);
      expect(fetchedEventType?.hideCalendarEventDetails).toEqual(eventType.hideCalendarEventDetails);
      expect(fetchedEventType?.hideOrganizerEmail).toEqual(eventType.hideOrganizerEmail);
      expect(fetchedEventType?.lockTimeZoneToggleOnBookingPage).toEqual(
        eventType.lockTimeZoneToggleOnBookingPage
      );
      expect(fetchedEventType?.color).toEqual(eventType.color);
      expect(fetchedEventType?.hidden).toEqual(false);

      expect(fetchedHiddenEventType?.id).toEqual(hiddenEventType.id);
      expect(fetchedHiddenEventType?.hidden).toEqual(true);
    });

    it(`/GET/event-types by username should not return hidden event type if auth of non event type owner provided`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types?username=${user.username}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyOrgUser}`)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(1);

      const fetchedEventType = responseBody.data?.find((et) => et.id === eventType.id);

      expect(fetchedEventType?.id).toEqual(eventType.id);
      expect(fetchedEventType?.ownerId).toEqual(user.id);
      expect(fetchedEventType?.hidden).toEqual(false);
    });

    it(`/GET/event-types by username should not return hidden event type if no auth provided`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types?username=${user.username}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(1);

      const fetchedEventType = responseBody.data?.find((et) => et.id === eventType.id);

      expect(fetchedEventType?.id).toEqual(eventType.id);
      expect(fetchedEventType?.ownerId).toEqual(user.id);
      expect(fetchedEventType?.hidden).toEqual(false);
    });

    it(`/GET/event-types by username and eventSlug`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types?username=${user.username}&eventSlug=${eventType.slug}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(1);

      const fetchedEventType = responseBody.data?.find((et) => et.id === eventType.id);

      expect(fetchedEventType?.id).toEqual(eventType.id);
      expect(fetchedEventType?.title).toEqual(eventType.title);
      expect(fetchedEventType?.description).toEqual(eventType.description);
      expect(fetchedEventType?.lengthInMinutes).toEqual(eventType.lengthInMinutes);
      expect(fetchedEventType?.lengthInMinutesOptions).toEqual(eventType.lengthInMinutesOptions);
      expect(fetchedEventType?.locations).toEqual(eventType.locations);
      expect(fetchedEventType?.bookingFields.sort(orderBySlug)).toEqual(
        eventType.bookingFields.sort(orderBySlug).filter((f) => ("hidden" in f ? !f?.hidden : true))
      );
      expect(fetchedEventType?.ownerId).toEqual(user.id);
      expect(fetchedEventType?.bookingLimitsCount).toEqual(eventType.bookingLimitsCount);
      expect(fetchedEventType?.onlyShowFirstAvailableSlot).toEqual(eventType.onlyShowFirstAvailableSlot);
      expect(fetchedEventType?.bookingLimitsDuration).toEqual(eventType.bookingLimitsDuration);
      expect(fetchedEventType?.offsetStart).toEqual(eventType.offsetStart);
      expect(fetchedEventType?.bookingWindow).toEqual(eventType.bookingWindow);
      expect(fetchedEventType?.bookerLayouts).toEqual(eventType.bookerLayouts);
      expect(fetchedEventType?.confirmationPolicy).toEqual(eventType.confirmationPolicy);
      expect(fetchedEventType?.recurrence).toEqual(eventType.recurrence);
      expect(fetchedEventType?.customName).toEqual(eventType.customName);
      expect(fetchedEventType?.requiresBookerEmailVerification).toEqual(
        eventType.requiresBookerEmailVerification
      );
      expect(fetchedEventType?.hideCalendarNotes).toEqual(eventType.hideCalendarNotes);
      expect(fetchedEventType?.hideCalendarEventDetails).toEqual(eventType.hideCalendarEventDetails);
      expect(fetchedEventType?.hideOrganizerEmail).toEqual(eventType.hideOrganizerEmail);
      expect(fetchedEventType?.lockTimeZoneToggleOnBookingPage).toEqual(
        eventType.lockTimeZoneToggleOnBookingPage
      );
      expect(fetchedEventType?.color).toEqual(eventType.color);
      expect(fetchedEventType?.hidden).toEqual(false);
    });

    it(`/GET/event-types by username and eventSlug should not return hidden event type if auth of non event type owner provided`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types?username=${user.username}&eventSlug=${hiddenEventType.slug}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyOrgUser}`)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(0);
    });

    it(`/GET/event-types by username and eventSlug should not return hidden event type if no auth provided`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types?username=${user.username}&eventSlug=${hiddenEventType.slug}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(0);
    });

    it(`/GET/event-types by username and orgSlug`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types?username=${orgUser.username}&orgSlug=${organization.slug}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(3);
      expect(responseBody.data?.find((e) => e.id === orgUserEventType1.id)?.id).toBeDefined();
      expect(responseBody.data?.find((e) => e.id === orgUserEventType2.id)?.id).toBeDefined();
      expect(responseBody.data?.find((e) => e.id === orgUserEventType3.id)?.id).toBeDefined();
    });

    it(`/GET/event-types by username and orgSlug and eventSlug`, async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/api/v2/event-types?username=${orgUser.username}&orgSlug=${organization.slug}&eventSlug=${orgUserEventType1.slug}`
        )
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(1);
      expect(responseBody.data?.find((e) => e.id === orgUserEventType1.id)?.id).toBeDefined();
    });

    it(`/GET/event-types by username and orgId`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types?username=${orgUser.username}&orgId=${organization.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(3);
      expect(responseBody.data?.find((e) => e.id === orgUserEventType1.id)?.id).toBeDefined();
      expect(responseBody.data?.find((e) => e.id === orgUserEventType2.id)?.id).toBeDefined();
      expect(responseBody.data?.find((e) => e.id === orgUserEventType3.id)?.id).toBeDefined();
    });

    it("should return an error when creating an event type with seats enabled and multiple locations", async () => {
      const body: CreateEventTypeInput_2024_06_14 = {
        title: "Coding class 2",
        slug: "coding-class-2",
        description: "Let's learn how to code like a pro.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "cal-video",
          },
          {
            type: "phone",
            phone: "+37120993151",
            public: true,
          },
        ],
        scheduleId: firstSchedule.id,
        seats: {
          seatsPerTimeSlot: 4,
          showAttendeeInfo: true,
          showAvailabilityCount: true,
        },
      };

      await request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .send(body)
        .expect(400);
    });

    it("should return an error when trying to enable seats for an event type with multiple locations", async () => {
      const body: CreateEventTypeInput_2024_06_14 = {
        title: "Coding class 3",
        slug: "coding-class-3",
        description: "Let's learn how to code like a pro.",
        lengthInMinutes: 60,
        locations: [
          {
            type: "integration",
            integration: "cal-video",
          },
          {
            type: "phone",
            phone: "+37120993151",
            public: true,
          },
        ],
        scheduleId: firstSchedule.id,
      };

      const createResponse = await request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .send(body)
        .expect(201);

      const createdEventType = createResponse.body.data;

      expect(createdEventType).toMatchObject({
        id: expect.any(Number),
        title: body.title,
        description: body.description,
        lengthInMinutes: body.lengthInMinutes,
        locations: body.locations,
        scheduleId: firstSchedule.id,
      });

      return request(app.getHttpServer())
        .patch(`/api/v2/event-types/${createdEventType.id}`)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send({
          seats: {
            seatsPerTimeSlot: 4,
            showAttendeeInfo: true,
            showAvailabilityCount: true,
          },
        })
        .expect(400);
    });

    it("should return an error when creating an event type with seats enabled and confirmationPolicy enabled", async () => {
      const body: CreateEventTypeInput_2024_06_14 = {
        title: "Coding class 4",
        slug: "coding-class-4",
        description: "Let's learn how to code like a pro.",
        lengthInMinutes: 60,
        scheduleId: firstSchedule.id,
        confirmationPolicy: {
          type: ConfirmationPolicyEnum.ALWAYS,
          blockUnconfirmedBookingsInBooker: false,
        },
        seats: {
          seatsPerTimeSlot: 4,
          showAttendeeInfo: true,
          showAvailabilityCount: true,
        },
      };

      await request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set("Authorization", `Bearer ${apiKeyString}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send(body)
        .expect(400);
    });

    it("should return an error when trying to enable seats for an event type with confirmationPolicy enabled", async () => {
      const body: CreateEventTypeInput_2024_06_14 = {
        title: "Coding class 5",
        slug: "coding-class-5",
        description: "Let's learn how to code like a pro.",
        lengthInMinutes: 60,
        confirmationPolicy: {
          type: ConfirmationPolicyEnum.ALWAYS,
          blockUnconfirmedBookingsInBooker: false,
        },
        scheduleId: firstSchedule.id,
      };

      const createResponse = await request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set("Authorization", `Bearer ${apiKeyString}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send(body)
        .expect(201);

      const createdEventType = createResponse.body.data;

      expect(createdEventType).toMatchObject({
        id: expect.any(Number),
        title: body.title,
        description: body.description,
        lengthInMinutes: body.lengthInMinutes,
        confirmationPolicy: body.confirmationPolicy,
        scheduleId: firstSchedule.id,
      });

      return request(app.getHttpServer())
        .patch(`/api/v2/event-types/${createdEventType.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .send({
          seats: {
            seatsPerTimeSlot: 4,
            showAttendeeInfo: true,
            showAvailabilityCount: true,
          },
        })
        .expect(400);
    });

    it("should return an error when trying to set multiple locations for an event type with seats enabled", async () => {
      const body: CreateEventTypeInput_2024_06_14 = {
        title: "Coding class 6",
        slug: "coding-class-6",
        description: "Let's learn how to code like a pro.",
        lengthInMinutes: 60,
        scheduleId: firstSchedule.id,
        seats: {
          seatsPerTimeSlot: 4,
          showAttendeeInfo: true,
          showAvailabilityCount: true,
        },
      };

      const createResponse = await request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .send(body)
        .expect(201);

      const createdEventType = createResponse.body.data;

      expect(createdEventType).toMatchObject({
        id: expect.any(Number),
        title: body.title,
        description: body.description,
        lengthInMinutes: body.lengthInMinutes,
        seats: body.seats,
        scheduleId: firstSchedule.id,
      });

      return request(app.getHttpServer())
        .patch(`/api/v2/event-types/${createdEventType.id}`)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send({
          locations: [
            {
              type: "integration",
              integration: "cal-video",
            },
            {
              type: "phone",
              phone: "+37120993151",
              public: true,
            },
          ],
        })
        .expect(400);
    });

    it("should return an error when creating an event type with confirmationPolicy enabled and seats enabled", async () => {
      const body: CreateEventTypeInput_2024_06_14 = {
        title: "Coding class 7",
        slug: "coding-class-7",
        description: "Let's learn how to code like a pro.",
        lengthInMinutes: 60,
        confirmationPolicy: {
          type: ConfirmationPolicyEnum.ALWAYS,
          blockUnconfirmedBookingsInBooker: false,
        },
        scheduleId: firstSchedule.id,
        seats: {
          seatsPerTimeSlot: 4,
          showAttendeeInfo: true,
          showAvailabilityCount: true,
        },
      };

      await request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set("Authorization", `Bearer ${apiKeyString}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send(body)
        .expect(400);
    });

    it("should return an error when trying to enable confirmationPolicy for an event type with seats enabled", async () => {
      const body: CreateEventTypeInput_2024_06_14 = {
        title: "Coding class 8",
        slug: "coding-class-8",
        description: "Let's learn how to code like a pro.",
        lengthInMinutes: 60,
        seats: {
          seatsPerTimeSlot: 4,
          showAttendeeInfo: true,
          showAvailabilityCount: true,
        },
        scheduleId: firstSchedule.id,
      };

      const createResponse = await request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set("Authorization", `Bearer ${apiKeyString}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send(body)
        .expect(201);

      const createdEventType = createResponse.body.data;

      expect(createdEventType).toMatchObject({
        id: expect.any(Number),
        title: body.title,
        description: body.description,
        lengthInMinutes: body.lengthInMinutes,
        seats: body.seats,
        scheduleId: firstSchedule.id,
      });

      return request(app.getHttpServer())
        .patch(`/api/v2/event-types/${createdEventType.id}`)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send({
          confirmationPolicy: {
            type: ConfirmationPolicyEnum.ALWAYS,
            blockUnconfirmedBookingsInBooker: false,
          },
        })
        .expect(400);
    });

    it("should update event type", async () => {
      const nameBookingField: NameDefaultFieldInput_2024_06_14 = {
        type: "name",
        label: "Your name sir / madam",
        placeholder: "john doe",
        disableOnPrefill: true,
      };

      const notesBookingField: NotesDefaultFieldInput_2024_06_14 = {
        slug: "notes",
        label: "lemme take some notes",
        placeholder: "write your notes here",
        required: true,
      };

      const newTitle = "Coding class in Italian!";

      const body: UpdateEventTypeInput_2024_06_14 = {
        title: newTitle,
        scheduleId: secondSchedule.id,
        lengthInMinutesOptions: [15, 30],
        calVideoSettings: {
          disableRecordingForGuests: true,
          disableRecordingForOrganizer: true,
          enableAutomaticRecordingForOrganizer: true,
          enableAutomaticTranscription: true,
          disableTranscriptionForGuests: true,
          disableTranscriptionForOrganizer: true,
        },
        bookingFields: [
          nameBookingField,
          {
            type: "select",
            label: "select which language you want to learn",
            slug: "select-language",
            required: true,
            placeholder: "select language",
            options: ["javascript", "python", "cobol"],
            disableOnPrefill: false,
            hidden: false,
          },
          notesBookingField,
        ],
        bookingLimitsCount: {
          day: 4,
          week: 10,
        },
        onlyShowFirstAvailableSlot: true,
        bookingLimitsDuration: {
          day: 100,
          week: 200,
        },
        offsetStart: 50,
        bookingWindow: {
          type: BookingWindowPeriodInputTypeEnum_2024_06_14.businessDays,
          value: 40,
          rolling: false,
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
          type: ConfirmationPolicyEnum.ALWAYS,
          blockUnconfirmedBookingsInBooker: false,
        },
        recurrence: {
          frequency: FrequencyInput.monthly,
          interval: 4,
          occurrences: 10,
          disabled: false,
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
        customName: `{Event type title} betweennnnnnnnnnn {Organiser} and {Scheduler}`,
        bookingRequiresAuthentication: false,
      };

      return request(app.getHttpServer())
        .patch(`/api/v2/event-types/${eventType.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
          const updatedEventType = responseBody.data;
          expect(updatedEventType.title).toEqual(body.title);

          expect(updatedEventType.id).toEqual(eventType.id);
          expect(updatedEventType.title).toEqual(newTitle);
          expect(updatedEventType.lengthInMinutesOptions).toEqual(body.lengthInMinutesOptions);
          expect(updatedEventType.description).toEqual(eventType.description);
          expect(updatedEventType.lengthInMinutes).toEqual(eventType.lengthInMinutes);
          expect(updatedEventType.locations).toEqual(eventType.locations);
          expect(updatedEventType.disableGuests).toEqual(false);

          const expectedBookingFields = [
            { ...defaultResponseBookingFieldName, ...nameBookingField },
            { ...defaultResponseBookingFieldEmail },
            { ...defaultResponseBookingFieldLocation },
            {
              type: "select",
              label: "select which language you want to learn",
              slug: "select-language",
              required: true,
              placeholder: "select language",
              options: ["javascript", "python", "cobol"],
              disableOnPrefill: false,
              hidden: false,
              isDefault: false,
            },
            { ...defaultResponseBookingFieldTitle },
            { ...defaultResponseBookingFieldNotes, ...notesBookingField },
            { ...defaultResponseBookingFieldGuests },
            { ...defaultResponseBookingFieldRescheduleReason },
          ];

          expect(updatedEventType.bookingFields).toEqual(expectedBookingFields);

          expect(updatedEventType.ownerId).toEqual(user.id);
          expect(updatedEventType.scheduleId).toEqual(secondSchedule.id);
          expect(updatedEventType.bookingLimitsCount).toEqual(body.bookingLimitsCount);
          expect(updatedEventType.onlyShowFirstAvailableSlot).toEqual(body.onlyShowFirstAvailableSlot);
          expect(updatedEventType.bookingLimitsDuration).toEqual(body.bookingLimitsDuration);
          expect(updatedEventType.offsetStart).toEqual(body.offsetStart);
          expect(updatedEventType.bookingWindow).toEqual(body.bookingWindow);
          expect(updatedEventType.bookerLayouts).toEqual(body.bookerLayouts);
          expect(updatedEventType.confirmationPolicy).toEqual(body.confirmationPolicy);
          expect(updatedEventType.recurrence).toEqual(body.recurrence);
          expect(updatedEventType.customName).toEqual(body.customName);
          expect(updatedEventType.requiresBookerEmailVerification).toEqual(
            body.requiresBookerEmailVerification
          );
          expect(updatedEventType.hideCalendarNotes).toEqual(body.hideCalendarNotes);
          expect(updatedEventType.hideCalendarEventDetails).toEqual(body.hideCalendarEventDetails);
          expect(updatedEventType.hideOrganizerEmail).toEqual(body.hideOrganizerEmail);
          expect(updatedEventType.lockTimeZoneToggleOnBookingPage).toEqual(
            body.lockTimeZoneToggleOnBookingPage
          );
          expect(updatedEventType.color).toEqual(body.color);
          expect(updatedEventType.calVideoSettings?.disableRecordingForGuests).toEqual(
            body.calVideoSettings?.disableRecordingForGuests
          );
          expect(updatedEventType.calVideoSettings?.disableRecordingForOrganizer).toEqual(
            body.calVideoSettings?.disableRecordingForOrganizer
          );
          expect(updatedEventType.calVideoSettings?.enableAutomaticRecordingForOrganizer).toEqual(
            body.calVideoSettings?.enableAutomaticRecordingForOrganizer
          );
          expect(updatedEventType.calVideoSettings?.enableAutomaticTranscription).toEqual(
            body.calVideoSettings?.enableAutomaticTranscription
          );
          expect(updatedEventType.calVideoSettings?.disableTranscriptionForGuests).toEqual(
            body.calVideoSettings?.disableTranscriptionForGuests
          );
          expect(updatedEventType.calVideoSettings?.disableTranscriptionForOrganizer).toEqual(
            body.calVideoSettings?.disableTranscriptionForOrganizer
          );

          eventType.title = newTitle;
          eventType.scheduleId = secondSchedule.id;
          eventType.lengthInMinutesOptions = updatedEventType.lengthInMinutesOptions;
          eventType.bookingLimitsCount = updatedEventType.bookingLimitsCount;
          eventType.onlyShowFirstAvailableSlot = updatedEventType.onlyShowFirstAvailableSlot;
          eventType.bookingLimitsDuration = updatedEventType.bookingLimitsDuration;
          eventType.offsetStart = updatedEventType.offsetStart;
          eventType.bookingWindow = updatedEventType.bookingWindow;
          eventType.bookerLayouts = updatedEventType.bookerLayouts;
          eventType.confirmationPolicy = updatedEventType.confirmationPolicy;
          eventType.recurrence = updatedEventType.recurrence;
          eventType.customName = updatedEventType.customName;
          eventType.requiresBookerEmailVerification = updatedEventType.requiresBookerEmailVerification;
          eventType.hideCalendarNotes = updatedEventType.hideCalendarNotes;
          eventType.hideCalendarEventDetails = updatedEventType.hideCalendarEventDetails;
          eventType.hideOrganizerEmail = updatedEventType.hideOrganizerEmail;
          eventType.lockTimeZoneToggleOnBookingPage = updatedEventType.lockTimeZoneToggleOnBookingPage;
          eventType.color = updatedEventType.color;
          eventType.bookingFields = updatedEventType.bookingFields;
          eventType.calVideoSettings = updatedEventType.calVideoSettings;

          expect(updatedEventType.bookingRequiresAuthentication).toEqual(false);
        });
    });

    it("should not allow to update event type with scheduleId user does not own", async () => {
      const body: UpdateEventTypeInput_2024_06_14 = {
        scheduleId: falseTestSchedule.id,
      };

      return request(app.getHttpServer())
        .patch(`/api/v2/event-types/${eventType.id}`)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send(body)
        .expect(404);
    });

    it("should not allow to update event type with integration not installed on user", async () => {
      const body: UpdateEventTypeInput_2024_06_14 = {
        locations: [
          {
            type: "integration",
            integration: "office365-video",
          },
        ],
      };

      return request(app.getHttpServer())
        .patch(`/api/v2/event-types/${eventType.id}`)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send(body)
        .expect(400);
    });

    it(`/GET/:id`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types/${eventType.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
      const fetchedEventType = responseBody.data;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(fetchedEventType.id).toEqual(eventType.id);
      expect(fetchedEventType.title).toEqual(eventType.title);
      expect(fetchedEventType.description).toEqual(eventType.description);
      expect(fetchedEventType.lengthInMinutes).toEqual(eventType.lengthInMinutes);
      expect(fetchedEventType.lengthInMinutesOptions).toEqual(eventType.lengthInMinutesOptions);
      expect(fetchedEventType.locations).toEqual(eventType.locations);
      expect(fetchedEventType.bookingFields).toEqual(eventType.bookingFields);
      expect(fetchedEventType.ownerId).toEqual(user.id);
      expect(fetchedEventType.bookingLimitsCount).toEqual(eventType.bookingLimitsCount);
      expect(fetchedEventType.onlyShowFirstAvailableSlot).toEqual(eventType.onlyShowFirstAvailableSlot);
      expect(fetchedEventType.bookingLimitsDuration).toEqual(eventType.bookingLimitsDuration);
      expect(fetchedEventType.offsetStart).toEqual(eventType.offsetStart);
      expect(fetchedEventType.bookingWindow).toEqual(eventType.bookingWindow);
      expect(fetchedEventType.bookerLayouts).toEqual(eventType.bookerLayouts);
      expect(fetchedEventType.confirmationPolicy).toEqual(eventType.confirmationPolicy);
      expect(fetchedEventType.recurrence).toEqual(eventType.recurrence);
      expect(fetchedEventType.customName).toEqual(eventType.customName);
      expect(fetchedEventType.requiresBookerEmailVerification).toEqual(
        eventType.requiresBookerEmailVerification
      );
      expect(fetchedEventType.hideCalendarNotes).toEqual(eventType.hideCalendarNotes);
      expect(fetchedEventType.hideCalendarEventDetails).toEqual(eventType.hideCalendarEventDetails);
      expect(fetchedEventType.hideOrganizerEmail).toEqual(eventType.hideOrganizerEmail);
      expect(fetchedEventType.lockTimeZoneToggleOnBookingPage).toEqual(
        eventType.lockTimeZoneToggleOnBookingPage
      );
      expect(fetchedEventType.color).toEqual(eventType.color);
    });

    it(`/GET/event-types by username and eventSlug`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v2/event-types?username=${username}&eventSlug=${eventType.slug}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;
      const fetchedEventType = responseBody.data[0];

      expect(fetchedEventType?.id).toEqual(eventType.id);
      expect(fetchedEventType?.title).toEqual(eventType.title);
      expect(fetchedEventType?.description).toEqual(eventType.description);
      expect(fetchedEventType?.lengthInMinutes).toEqual(eventType.lengthInMinutes);
      expect(fetchedEventType?.lengthInMinutesOptions).toEqual(eventType.lengthInMinutesOptions);
      expect(fetchedEventType?.locations).toEqual(eventType.locations);
      expect(fetchedEventType?.bookingFields.sort(orderBySlug)).toEqual(
        eventType.bookingFields.sort(orderBySlug).filter((f) => ("hidden" in f ? !f?.hidden : true))
      );
      expect(fetchedEventType?.ownerId).toEqual(user.id);
      expect(fetchedEventType.bookingLimitsCount).toEqual(eventType.bookingLimitsCount);
      expect(fetchedEventType.onlyShowFirstAvailableSlot).toEqual(eventType.onlyShowFirstAvailableSlot);
      expect(fetchedEventType.bookingLimitsDuration).toEqual(eventType.bookingLimitsDuration);
      expect(fetchedEventType.offsetStart).toEqual(eventType.offsetStart);
      expect(fetchedEventType.bookingWindow).toEqual(eventType.bookingWindow);
      expect(fetchedEventType.bookerLayouts).toEqual(eventType.bookerLayouts);
      expect(fetchedEventType.confirmationPolicy).toEqual(eventType.confirmationPolicy);
      expect(fetchedEventType.recurrence).toEqual(eventType.recurrence);
      expect(fetchedEventType.customName).toEqual(eventType.customName);
      expect(fetchedEventType.requiresBookerEmailVerification).toEqual(
        eventType.requiresBookerEmailVerification
      );
      expect(fetchedEventType.hideCalendarNotes).toEqual(eventType.hideCalendarNotes);
      expect(fetchedEventType.hideCalendarEventDetails).toEqual(eventType.hideCalendarEventDetails);
      expect(fetchedEventType.hideOrganizerEmail).toEqual(eventType.hideOrganizerEmail);
      expect(fetchedEventType.lockTimeZoneToggleOnBookingPage).toEqual(
        eventType.lockTimeZoneToggleOnBookingPage
      );
      expect(fetchedEventType.color).toEqual(eventType.color);
    });

    it(`/GET/:id not existing`, async () => {
      await request(app.getHttpServer())
        .get(`/api/v2/event-types/1000`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .expect(404);
    });

    it("should delete event type", async () => {
      return request(app.getHttpServer())
        .delete(`/api/v2/event-types/${eventType.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .set("Authorization", `Bearer ${apiKeyString}`)
        .expect(200);
    });

    describe("bookerActiveBookingsLimit", () => {
      describe("negative tests", () => {
        it("should not create an event type with bookerActiveBookingsLimit and recurrence", async () => {
          const body: CreateEventTypeInput_2024_06_14 = {
            title: "Coding class with bookerActiveBookingsLimit",
            slug: "coding-class-booker-active-bookings-limit",
            description: "Let's learn how to code like a pro.",
            lengthInMinutes: 60,
            bookerActiveBookingsLimit: {
              maximumActiveBookings: 2,
              offerReschedule: true,
            },
            recurrence: {
              frequency: FrequencyInput.weekly,
              interval: 2,
              occurrences: 10,
            },
          };

          const response = await request(app.getHttpServer())
            .post("/api/v2/event-types")
            .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .send(body)
            .expect(400);

          expect(
            response.body.error.message.includes(FAILED_RECURRING_EVENT_TYPE_WITH_BOOKER_LIMITS_ERROR_MESSAGE)
          ).toBe(true);
        });

        it("should not allow creating an event type with bookerActiveBookingsLimit disabled:false", async () => {
          const body: CreateEventTypeInput_2024_06_14 = {
            title: "Coding class with bookerActiveBookingsLimit disabled:false",
            slug: "coding-class-booker-active-bookings-limit-disabled",
            description: "Let's learn how to code like a pro.",
            lengthInMinutes: 60,
            // note(Lauris): disabled false means that it is enabled so it should have maximumActiveBookings and / or offerReschedule provided
            bookerActiveBookingsLimit: {
              disabled: false,
            },
          };

          const response = await request(app.getHttpServer())
            .post("/api/v2/event-types")
            .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .send(body)
            .expect(400);

          expect(response.body.error.message.includes(REQUIRES_AT_LEAST_ONE_PROPERTY_ERROR)).toBe(true);
        });
      });

      describe("positive tests", () => {
        let eventTypeWithBookerActiveBookingsLimitId: number;

        it("should create an event type with bookerActiveBookingsLimit", async () => {
          const body: CreateEventTypeInput_2024_06_14 = {
            title: "Coding class with bookerActiveBookingsLimit",
            slug: "coding-class-booker-active-bookings-limit",
            description: "Let's learn how to code like a pro.",
            lengthInMinutes: 60,
            bookerActiveBookingsLimit: {
              maximumActiveBookings: 2,
              offerReschedule: true,
            },
          };

          return request(app.getHttpServer())
            .post("/api/v2/event-types")
            .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .send(body)
            .expect(201)
            .then(async (response) => {
              const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
              const createdEventType = responseBody.data;
              expect(createdEventType).toHaveProperty("id");
              expect(createdEventType.title).toEqual(body.title);
              expect(createdEventType.bookerActiveBookingsLimit).toEqual(body.bookerActiveBookingsLimit);
              eventTypeWithBookerActiveBookingsLimitId = createdEventType.id;
            });
        });

        it("should update an event type with bookerActiveBookingsLimit", async () => {
          const body: UpdateEventTypeInput_2024_06_14 = {
            bookerActiveBookingsLimit: {
              disabled: true,
            },
          };

          return request(app.getHttpServer())
            .patch(`/api/v2/event-types/${eventTypeWithBookerActiveBookingsLimitId}`)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .send(body)
            .expect(200)
            .then(async (response) => {
              const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
              const updatedEventType = responseBody.data;
              expect(updatedEventType.bookerActiveBookingsLimit).toEqual(body.bookerActiveBookingsLimit);
              eventTypeWithBookerActiveBookingsLimitId = updatedEventType.id;
            });
        });

        it("should create an event type with bookerActiveBookingsLimit and recurrence disabled", async () => {
          const body: CreateEventTypeInput_2024_06_14 = {
            title: "Coding class with bookerActiveBookingsLimit and recurrence disabled",
            slug: "coding-class-booker-active-bookings-limit-recurrence-disabled",
            description: "Let's learn how to code like a pro.",
            lengthInMinutes: 60,
            bookerActiveBookingsLimit: {
              maximumActiveBookings: 2,
              offerReschedule: true,
            },
            recurrence: {
              disabled: true,
            },
          };

          return request(app.getHttpServer())
            .post("/api/v2/event-types")
            .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .send(body)
            .expect(201)
            .then(async (response) => {
              const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
              const createdEventType = responseBody.data;
              expect(createdEventType).toHaveProperty("id");
              expect(createdEventType.title).toEqual(body.title);
              expect(createdEventType.bookerActiveBookingsLimit).toEqual(body.bookerActiveBookingsLimit);
              eventTypeWithBookerActiveBookingsLimitId = createdEventType.id;
            });
        });

        it("should create an event type with recurrence and bookerActiveBookingsLimit disabled", async () => {
          const body: CreateEventTypeInput_2024_06_14 = {
            title: "Coding class with bookerActiveBookingsLimit disabled and recurrence",
            slug: "coding-class-booker-active-bookings-limit-disabled-and-recurrence",
            description: "Let's learn how to code like a pro.",
            lengthInMinutes: 60,
            bookerActiveBookingsLimit: {
              disabled: true,
            },
            recurrence: {
              frequency: FrequencyInput.weekly,
              interval: 2,
              occurrences: 10,
            },
          };

          return request(app.getHttpServer())
            .post("/api/v2/event-types")
            .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .send(body)
            .expect(201)
            .then(async (response) => {
              const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
              const createdEventType = responseBody.data;
              expect(createdEventType).toHaveProperty("id");
              expect(createdEventType.title).toEqual(body.title);
              expect(createdEventType.bookerActiveBookingsLimit).toEqual(body.bookerActiveBookingsLimit);
              eventTypeWithBookerActiveBookingsLimitId = createdEventType.id;
            });
        });
      });
    });

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      try {
        await eventTypesRepositoryFixture.delete(eventType.id);
      } catch (e) {
        console.log(e);
      }
      try {
        await userRepositoryFixture.delete(user.id);
      } catch (e) {
        console.log(e);
      }
      try {
        await userRepositoryFixture.delete(falseTestUser.id);
      } catch (e) {
        console.log(e);
      }

      try {
        await userRepositoryFixture.delete(orgUser.id);
      } catch (e) {
        console.log(e);
      }
      await app.close();
    });

    describe("confirmationPolicy", () => {
      describe("negative tests", () => {
        it("should not create an event type with type 'time' without noticeThreshold", async () => {
          const body: CreateEventTypeInput_2024_06_14 = {
            title: "Event requiring confirmation with time",
            slug: "event-confirmation-time-missing-threshold",
            description: "This event requires confirmation based on time.",
            lengthInMinutes: 60,
            confirmationPolicy: {
              type: ConfirmationPolicyEnum.TIME,
              blockUnconfirmedBookingsInBooker: true,
            },
          };

          const response = await request(app.getHttpServer())
            .post("/api/v2/event-types")
            .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .send(body)
            .expect(400);

          expect(response.body.error).toBeDefined();
          expect(response.status).toBe(400);
        });

        it("should not update an event type to type 'time' without noticeThreshold", async () => {
          // First create an event type with type 'always'
          const createBody: CreateEventTypeInput_2024_06_14 = {
            title: "Event requiring confirmation always",
            slug: "event-confirmation-always-to-time",
            description: "This event always requires confirmation.",
            lengthInMinutes: 60,
            confirmationPolicy: {
              type: ConfirmationPolicyEnum.ALWAYS,
              blockUnconfirmedBookingsInBooker: true,
            },
          };

          const createResponse = await request(app.getHttpServer())
            .post("/api/v2/event-types")
            .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .send(createBody)
            .expect(201);

          const createdEventType = createResponse.body.data;

          // Try to update to type 'time' without noticeThreshold
          const updateBody: UpdateEventTypeInput_2024_06_14 = {
            confirmationPolicy: {
              type: ConfirmationPolicyEnum.TIME,
              blockUnconfirmedBookingsInBooker: true,
            },
          };

          const updateResponse = await request(app.getHttpServer())
            .patch(`/api/v2/event-types/${createdEventType.id}`)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .send(updateBody)
            .expect(400);

          expect(updateResponse.body.error).toBeDefined();
          expect(updateResponse.status).toBe(400);

          // Cleanup
          await eventTypesRepositoryFixture.delete(createdEventType.id);
        });
      });

      describe("positive tests", () => {
        let eventTypeWithConfirmationTimeId: number;

        it("should create an event type with type 'always'", async () => {
          const body: CreateEventTypeInput_2024_06_14 = {
            title: "Event requiring confirmation always",
            slug: "event-confirmation-always",
            description: "This event always requires confirmation.",
            lengthInMinutes: 60,
            confirmationPolicy: {
              type: ConfirmationPolicyEnum.ALWAYS,
              blockUnconfirmedBookingsInBooker: true,
            },
          };

          return request(app.getHttpServer())
            .post("/api/v2/event-types")
            .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .send(body)
            .expect(201)
            .then(async (response) => {
              const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
              const createdEventType = responseBody.data;
              expect(createdEventType).toHaveProperty("id");
              expect(createdEventType.title).toEqual(body.title);
              expect(createdEventType.confirmationPolicy).toEqual(body.confirmationPolicy);
              await eventTypesRepositoryFixture.delete(createdEventType.id);
            });
        });

        it("should create an event type with type 'time' and noticeThreshold", async () => {
          const body: CreateEventTypeInput_2024_06_14 = {
            title: "Event requiring confirmation with time",
            slug: "event-confirmation-time-with-threshold",
            description: "This event requires confirmation based on time.",
            lengthInMinutes: 60,
            confirmationPolicy: {
              type: ConfirmationPolicyEnum.TIME,
              noticeThreshold: {
                unit: NoticeThresholdUnitEnum.HOURS,
                count: 24,
              },
              blockUnconfirmedBookingsInBooker: true,
            },
          };

          return request(app.getHttpServer())
            .post("/api/v2/event-types")
            .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .send(body)
            .expect(201)
            .then(async (response) => {
              const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
              const createdEventType = responseBody.data;
              expect(createdEventType).toHaveProperty("id");
              expect(createdEventType.title).toEqual(body.title);
              expect(createdEventType.confirmationPolicy).toEqual(body.confirmationPolicy);
              eventTypeWithConfirmationTimeId = createdEventType.id;
            });
        });

        it("should update an event type from type 'time' to 'always'", async () => {
          const body: UpdateEventTypeInput_2024_06_14 = {
            confirmationPolicy: {
              type: ConfirmationPolicyEnum.ALWAYS,
              blockUnconfirmedBookingsInBooker: false,
            },
          };

          return request(app.getHttpServer())
            .patch(`/api/v2/event-types/${eventTypeWithConfirmationTimeId}`)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .send(body)
            .expect(200)
            .then(async (response) => {
              const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
              const updatedEventType = responseBody.data;
              const policy = updatedEventType.confirmationPolicy as any;
              expect(policy?.type).toEqual(ConfirmationPolicyEnum.ALWAYS);
              expect(policy?.blockUnconfirmedBookingsInBooker).toEqual(false);
              expect(policy?.noticeThreshold).toBeUndefined();
            });
        });

        it("should update an event type from type 'always' to 'time' with noticeThreshold", async () => {
          const body: UpdateEventTypeInput_2024_06_14 = {
            confirmationPolicy: {
              type: ConfirmationPolicyEnum.TIME,
              noticeThreshold: {
                unit: NoticeThresholdUnitEnum.MINUTES,
                count: 120,
              },
              blockUnconfirmedBookingsInBooker: true,
            },
          };

          return request(app.getHttpServer())
            .patch(`/api/v2/event-types/${eventTypeWithConfirmationTimeId}`)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .send(body)
            .expect(200)
            .then(async (response) => {
              const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
              const updatedEventType = responseBody.data;
              const policy = updatedEventType.confirmationPolicy as any;
              expect(policy?.type).toEqual(ConfirmationPolicyEnum.TIME);
              expect(policy?.noticeThreshold).toEqual({
                unit: NoticeThresholdUnitEnum.MINUTES,
                count: 120,
              });
              expect(policy?.blockUnconfirmedBookingsInBooker).toEqual(true);
              await eventTypesRepositoryFixture.delete(eventTypeWithConfirmationTimeId);
            });
        });
      });
    });
  });

  describe("Handle event-types booking fields", () => {
    let app: INestApplication;

    let oAuthClient: PlatformOAuthClient;
    let organization: Team;
    let userRepositoryFixture: UserRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;

    const userEmail = "legacy-event-types-test-e2e@api.com";
    const name = "bob-the-builder";
    const username = name;
    let user: User;
    let legacyEventTypeId1: number;
    let legacyEventTypeId2: number;

    const expectedReturnSystemFields = [
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
        isDefault: true,
        type: "radioInput",
        slug: "location",
        required: false,
        hidden: false,
      },
      { isDefault: true, required: true, slug: "title", type: "text", disableOnPrefill: false, hidden: true },
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
        required: false,
        slug: "notes",
        type: "textarea",
        disableOnPrefill: false,
        hidden: false,
      },
    ];

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          providers: [PrismaExceptionFilter, HttpExceptionFilter],
          imports: [AppModule, UsersModule, EventTypesModule_2024_06_14, TokensModule],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

      organization = await teamRepositoryFixture.create({
        name: `event-types-2024-06-14-organization-${randomString()}`,
      });
      oAuthClient = await createOAuthClient(organization.id);
      user = await userRepositoryFixture.create({
        email: userEmail,
        name,
        username,
      });

      await app.init();
    });

    async function createOAuthClient(organizationId: number) {
      const data = {
        logo: "logo-url",
        name: "name",
        redirectUris: ["redirect-uri"],
        permissions: 32,
      };
      const secret = "secret";

      const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
      return client;
    }

    it("should be defined", () => {
      expect(oauthClientRepositoryFixture).toBeDefined();
      expect(userRepositoryFixture).toBeDefined();
      expect(oAuthClient).toBeDefined();
      expect(user).toBeDefined();
    });

    it("should not allow creating an event type with input of event-types version 2024_04_15", async () => {
      const body: CreateEventTypeInput_2024_04_15 = {
        title: "Coding class",
        slug: "coding-class",
        description: "Let's learn how to code like a pro.",
        length: 60,
        locations: [{ type: "integrations:daily" }],
      };

      return request(app.getHttpServer())
        .post("/api/v2/event-types")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .send(body)
        .expect(400);
    });

    it("should return system bookingFields stored in database", async () => {
      const legacyEventTypeInput = {
        title: "legacy event type",
        description: "legacy event type description",
        length: 40,
        hidden: false,
        slug: "legacy-event-type",
        locations: [],
        schedulingType: SchedulingType.ROUND_ROBIN,
        bookingFields: [
          {
            name: "name",
            type: "name",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system",
            required: true,
            defaultLabel: "your_name",
          },
          {
            name: "email",
            type: "email",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system",
            required: true,
            defaultLabel: "email_address",
          },
          {
            name: "location",
            type: "radioInput",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system",
            required: false,
            placeholder: "",
            defaultLabel: "location",
            getOptionsAt: "locations",
            optionsInputs: {
              phone: { type: "phone", required: true, placeholder: "" },
              attendeeInPerson: { type: "address", required: true, placeholder: "" },
            },
            hideWhenJustOneOption: true,
          },
          {
            name: "title",
            type: "text",
            hidden: true,
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: true,
            defaultLabel: "what_is_this_meeting_about",
            defaultPlaceholder: "",
          },
          {
            name: "guests",
            type: "multiemail",
            hidden: false,
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "additional_guests",
            defaultPlaceholder: "email",
          },
          {
            name: "rescheduleReason",
            type: "textarea",
            views: [{ id: "reschedule", label: "Reschedule View" }],
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "reason_for_reschedule",
            defaultPlaceholder: "reschedule_placeholder",
          },
          {
            name: "attendeePhoneNumber",
            type: "phone",
            hidden: true,
            sources: [
              {
                id: "default",
                type: "default",
                label: "Default",
              },
            ],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "phone_number",
          },
          {
            name: "notes",
            type: "textarea",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "additional_notes",
            defaultPlaceholder: "share_additional_notes",
          },
        ],
      };
      const legacyEventType = await eventTypesRepositoryFixture.create(legacyEventTypeInput, user.id);
      legacyEventTypeId1 = legacyEventType.id;

      return request(app.getHttpServer())
        .get(`/api/v2/event-types/${legacyEventTypeId1}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
          const fetchedEventType = responseBody.data;
          expect(fetchedEventType.bookingFields).toEqual(expectedReturnSystemFields);
        });
    });

    it("should return user created bookingFields with system fields", async () => {
      const userDefinedBookingField = {
        name: "team",
        type: "textarea",
        label: "your team",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        placeholder: "FC Barcelona",
      };

      const legacyEventTypeInput = {
        title: "legacy event type two",
        description: "legacy event type description two",
        length: 40,
        hidden: false,
        slug: "legacy-event-type-two",
        locations: [],
        schedulingType: SchedulingType.ROUND_ROBIN,
        bookingFields: [
          userDefinedBookingField,
          {
            name: "name",
            type: "name",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system",
            required: true,
            defaultLabel: "your_name",
          },
          {
            name: "email",
            type: "email",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system",
            required: true,
            defaultLabel: "email_address",
          },
          {
            name: "location",
            type: "radioInput",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system",
            required: false,
            placeholder: "",
            defaultLabel: "location",
            getOptionsAt: "locations",
            optionsInputs: {
              phone: { type: "phone", required: true, placeholder: "" },
              attendeeInPerson: { type: "address", required: true, placeholder: "" },
            },
            hideWhenJustOneOption: true,
          },
          {
            name: "title",
            type: "text",
            hidden: true,
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: true,
            defaultLabel: "what_is_this_meeting_about",
            defaultPlaceholder: "",
          },
          {
            name: "guests",
            type: "multiemail",
            hidden: false,
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "additional_guests",
            defaultPlaceholder: "email",
          },
          {
            name: "rescheduleReason",
            type: "textarea",
            views: [{ id: "reschedule", label: "Reschedule View" }],
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "reason_for_reschedule",
            defaultPlaceholder: "reschedule_placeholder",
          },
          {
            name: "attendeePhoneNumber",
            type: "phone",
            hidden: true,
            sources: [
              {
                id: "default",
                type: "default",
                label: "Default",
              },
            ],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "phone_number",
          },
          {
            name: "notes",
            type: "textarea",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "additional_notes",
            defaultPlaceholder: "share_additional_notes",
          },
        ],
      };
      const legacyEventType = await eventTypesRepositoryFixture.create(legacyEventTypeInput, user.id);
      legacyEventTypeId2 = legacyEventType.id;

      return request(app.getHttpServer())
        .get(`/api/v2/event-types/${legacyEventTypeId2}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
          const fetchedEventType = responseBody.data;

          expect(fetchedEventType.bookingFields.sort(orderBySlug)).toEqual(
            [
              {
                isDefault: false,
                type: userDefinedBookingField.type,
                slug: userDefinedBookingField.name,
                label: userDefinedBookingField.label,
                required: userDefinedBookingField.required,
                placeholder: userDefinedBookingField.placeholder,
                disableOnPrefill: false,
                hidden: false,
              },
              ...expectedReturnSystemFields,
            ].sort(orderBySlug)
          );
        });
    });

    it("should return event type with unknown bookingField", async () => {
      const unknownSystemField = {
        name: "unknown-whatever",
        type: "unknown-whatever",
        label: "your team",
        sources: [
          {
            id: "user",
            type: "user",
            label: "User",
            fieldRequired: true,
          },
        ],
        editable: "user",
        required: true,
        placeholder: "FC Barcelona",
      };

      const eventTypeInput = {
        title: "unknown field event type two",
        description: "unknown field event type description two",
        length: 40,
        hidden: false,
        slug: "unknown-field-type-two",
        locations: [],
        schedulingType: SchedulingType.ROUND_ROBIN,
        bookingFields: [unknownSystemField],
      };
      const eventType = await eventTypesRepositoryFixture.create(eventTypeInput, user.id);

      return request(app.getHttpServer())
        .get(`/api/v2/event-types/${eventType.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
          const fetchedEventType = responseBody.data;

          expect(fetchedEventType.bookingFields).toEqual([
            {
              type: "unknown",
              slug: "unknown",
              bookingField: JSON.stringify(unknownSystemField),
            },
          ]);
        });
    });

    it("should return event type with default bookingFields if they are not defined", async () => {
      const eventTypeInput = {
        title: "undefined booking fields",
        description: "undefined booking fields",
        length: 40,
        hidden: false,
        slug: `undefined-booking-fields-${randomString()}`,
        locations: [],
        schedulingType: SchedulingType.ROUND_ROBIN,
      };
      const eventType = await eventTypesRepositoryFixture.create(eventTypeInput, user.id);

      return request(app.getHttpServer())
        .get(`/api/v2/event-types/${eventType.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
          const fetchedEventType = responseBody.data;

          expect(fetchedEventType.bookingFields).toEqual([
            {
              isDefault: true,
              type: "name",
              slug: "name",
              required: true,
              disableOnPrefill: false,
            },
            {
              isDefault: true,
              type: "email",
              slug: "email",
              required: true,
              disableOnPrefill: false,
              hidden: false,
            },
            {
              disableOnPrefill: false,
              hidden: true,
              isDefault: true,
              required: false,
              slug: "attendeePhoneNumber",
              type: "phone",
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

    describe("creating event type with input of another event type output", () => {
      let firstCreatedEventType: EventTypeOutput_2024_06_14;
      let secondCreatedEventType: EventTypeOutput_2024_06_14;

      it("should create first event type", async () => {
        const body: CreateEventTypeInput_2024_06_14 = {
          title: "first created coding class",
          slug: "first-created-coding-class",
          lengthInMinutes: 60,
          locations: [
            {
              type: "address",
              address: "via volturno 10, Roma",
              public: true,
            },
          ],
        };

        return request(app.getHttpServer())
          .post("/api/v2/event-types")
          .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
            const createdEventType = responseBody.data;
            expect(createdEventType).toHaveProperty("id");
            expect(createdEventType.title).toEqual(body.title);
            expect(createdEventType.locations).toEqual(body.locations);
            firstCreatedEventType = responseBody.data;
          });
      });

      it("should create second event type using first as input", async () => {
        const body = {
          ...firstCreatedEventType,
          title: "second created coding class",
          slug: "second-created-coding-class",
        };

        return request(app.getHttpServer())
          .post("/api/v2/event-types")
          .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
            const createdEventType = responseBody.data;
            expect(createdEventType).toHaveProperty("id");
            expect(createdEventType.title).toEqual(body.title);
            secondCreatedEventType = responseBody.data;

            const { id, title, slug, ...restFirst } = firstCreatedEventType;
            const { id: id2, title: title2, slug: slug2, ...restSecond } = secondCreatedEventType;
            expect(restFirst).toEqual(restSecond);
            expect(id2).not.toEqual(id);
            expect(title2).not.toEqual(title);
            expect(slug2).not.toEqual(slug);
          });
      });

      it("should create event type with cal video settings", async () => {
        const body: CreateEventTypeInput_2024_06_14 = {
          title: "event type with cal video settings",
          slug: "event-type-with-cal-video-settings",
          lengthInMinutes: 60,
          calVideoSettings: {
            disableRecordingForGuests: true,
            disableRecordingForOrganizer: true,
            enableAutomaticRecordingForOrganizer: true,
          },
          locations: [
            {
              type: "integration",
              integration: "cal-video",
            },
          ],
        };

        return request(app.getHttpServer())
          .post("/api/v2/event-types")
          .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
            const createdEventType = responseBody.data;
            expect(createdEventType).toHaveProperty("id");
            expect(createdEventType.title).toEqual(body.title);
            expect(createdEventType.locations).toEqual(body.locations);
            expect(createdEventType.calVideoSettings?.disableRecordingForGuests).toEqual(true);
            expect(createdEventType.calVideoSettings?.disableRecordingForOrganizer).toEqual(true);
            expect(createdEventType.calVideoSettings?.enableAutomaticRecordingForOrganizer).toEqual(true);
            firstCreatedEventType = responseBody.data;
          });
      });
    });

    describe("toggle disable guests", () => {
      let eventTypeWithGuestsDisabledId: number;

      it("should create an event type with guests disabled", async () => {
        const body: CreateEventTypeInput_2024_06_14 = {
          title: "Coding class guests disabled",
          slug: "coding-class-guests-disabled",
          description: "Let's learn how to code like a pro.",
          lengthInMinutes: 60,
          disableGuests: true,
        };

        return request(app.getHttpServer())
          .post("/api/v2/event-types")
          .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
            const createdEventType = responseBody.data;
            expect(createdEventType).toHaveProperty("id");
            expect(createdEventType.title).toEqual(body.title);
            expect(createdEventType.description).toEqual(body.description);
            expect(createdEventType.lengthInMinutes).toEqual(body.lengthInMinutes);

            expect(createdEventType.disableGuests).toEqual(true);
            const guestsBookingField = createdEventType.bookingFields.find(
              (field) => field.slug === "guests"
            ) as GuestsDefaultFieldOutput_2024_06_14 | undefined;
            expect(guestsBookingField?.hidden).toEqual(true);

            eventTypeWithGuestsDisabledId = createdEventType.id;
          });
      });

      it("should update an event type with guests enabled", async () => {
        const body: UpdateEventTypeInput_2024_06_14 = {
          disableGuests: false,
        };

        return request(app.getHttpServer())
          .patch(`/api/v2/event-types/${eventTypeWithGuestsDisabledId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
          .send(body)
          .expect(200)
          .then(async (response) => {
            const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
            const updatedEventType = responseBody.data;

            expect(updatedEventType.disableGuests).toEqual(false);
            const guestsBookingField = updatedEventType.bookingFields.find(
              (field) => field.slug === "guests"
            ) as GuestsDefaultFieldOutput_2024_06_14 | undefined;
            expect(guestsBookingField?.hidden).toEqual(false);

            eventTypeWithGuestsDisabledId = updatedEventType.id;
          });
      });

      it("should update an event type with guests disabled", async () => {
        const body: UpdateEventTypeInput_2024_06_14 = {
          disableGuests: true,
        };

        return request(app.getHttpServer())
          .patch(`/api/v2/event-types/${eventTypeWithGuestsDisabledId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
          .send(body)
          .expect(200)
          .then(async (response) => {
            const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
            const updatedEventType = responseBody.data;

            expect(updatedEventType.disableGuests).toEqual(true);
            const guestsBookingField = updatedEventType.bookingFields.find(
              (field) => field.slug === "guests"
            ) as GuestsDefaultFieldOutput_2024_06_14 | undefined;
            expect(guestsBookingField?.hidden).toEqual(true);

            eventTypeWithGuestsDisabledId = updatedEventType.id;
          });
      });

      afterAll(async () => {
        if (eventTypeWithGuestsDisabledId) {
          await eventTypesRepositoryFixture.delete(eventTypeWithGuestsDisabledId);
        }
      });
    });

    describe("split name booking field", () => {
      it("should create an event type with split name booking field", async () => {
        const splitNameBookingField: SplitNameDefaultFieldOutput_2024_06_14 = {
          isDefault: true,
          type: "splitName",
          slug: "splitName",
          firstNameLabel: "First name",
          firstNamePlaceholder: "",
          lastNameLabel: "last name",
          lastNamePlaceholder: "",
          lastNameRequired: false,
          disableOnPrefill: false,
        };

        const body: CreateEventTypeInput_2024_06_14 = {
          title: "Coding class 9",
          slug: "coding-class-9",
          description: "Let's learn how to code like a pro.",
          lengthInMinutes: 60,
          bookingFields: [splitNameBookingField],
        };

        return request(app.getHttpServer())
          .post("/api/v2/event-types")
          .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
            const createdEventType = responseBody.data;

            const splitNameBookingFieldResponse = createdEventType.bookingFields.find(
              (field) => field.type === "splitName"
            ) as SplitNameDefaultFieldOutput_2024_06_14 | undefined;
            expect(splitNameBookingFieldResponse).toEqual(splitNameBookingField);

            await eventTypesRepositoryFixture.delete(createdEventType.id);
          });
      });
    });

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      try {
        await eventTypesRepositoryFixture.delete(legacyEventTypeId1);
        await eventTypesRepositoryFixture.delete(legacyEventTypeId2);
      } catch (e) {
        console.log(e);
      }
      try {
        await userRepositoryFixture.delete(user.id);
      } catch (e) {
        console.log(e);
      }
      await app.close();
    });
  });

  describe("Handle event-types locations", () => {
    let app: INestApplication;

    let oAuthClient: PlatformOAuthClient;
    let organization: Team;
    let userRepositoryFixture: UserRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;

    const userEmail = "locations-event-types-test-e2e@api.com";
    const name = "bob-the-locations-builder";
    const username = name;
    let user: User;
    let legacyEventTypeId1: number;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          providers: [PrismaExceptionFilter, HttpExceptionFilter],
          imports: [AppModule, UsersModule, EventTypesModule_2024_06_14, TokensModule],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

      organization = await teamRepositoryFixture.create({
        name: `event-types-2024-06-14-organization-${randomString()}`,
      });
      oAuthClient = await createOAuthClient(organization.id);
      user = await userRepositoryFixture.create({
        email: userEmail,
        name,
        username,
      });

      await app.init();
    });

    async function createOAuthClient(organizationId: number) {
      const data = {
        logo: "logo-url",
        name: "name",
        redirectUris: ["redirect-uri"],
        permissions: 32,
      };
      const secret = "secret";

      const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
      return client;
    }

    it("should return integration location with link and credentialId", async () => {
      const eventTypeInput = {
        title: "event type discord",
        description: "event type description",
        length: 40,
        hidden: false,
        slug: "discord-event-type",
        locations: [
          {
            type: "integrations:discord_video",
            link: "https://discord.com/users/100",
            credentialId: 100,
          },
        ],
        schedulingType: SchedulingType.ROUND_ROBIN,
        bookingFields: [],
      };
      const legacyEventType = await eventTypesRepositoryFixture.create(eventTypeInput, user.id);
      legacyEventTypeId1 = legacyEventType.id;

      return request(app.getHttpServer())
        .get(`/api/v2/event-types/${legacyEventTypeId1}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
          const fetchedEventType = responseBody.data;
          expect(fetchedEventType.locations).toEqual([
            {
              type: "integration",
              integration: "discord-video",
              link: eventTypeInput.locations[0].link,
              credentialId: eventTypeInput.locations[0].credentialId,
            },
          ]);
        });
    });

    it("should return unsupported location", async () => {
      const eventTypeInput = {
        title: "event type not existing",
        description: "event type description",
        length: 40,
        hidden: false,
        slug: "not-existing-event-type",
        locations: [
          {
            type: "this-type-does-not-exist",
          },
        ],
        schedulingType: SchedulingType.ROUND_ROBIN,
        bookingFields: [],
      };
      const legacyEventType = await eventTypesRepositoryFixture.create(eventTypeInput, user.id);
      legacyEventTypeId1 = legacyEventType.id;

      return request(app.getHttpServer())
        .get(`/api/v2/event-types/${legacyEventTypeId1}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
          const fetchedEventType = responseBody.data;
          expect(fetchedEventType.locations).toEqual([
            { type: "unknown", location: JSON.stringify(eventTypeInput.locations[0]) },
          ]);
        });
    });

    describe("EventType Hidden Property", () => {
      let createdEventTypeId: number;

      it("should create an event type with hidden=true", async () => {
        const createPayload = {
          title: "Hidden Event",
          slug: "hidden-event",
          lengthInMinutes: 30,
          hidden: true,
        };

        const response = await request(app.getHttpServer())
          .post("/api/v2/event-types")
          .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
          .send(createPayload)
          .expect(201);

        const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
        const createdEventType = responseBody.data;
        expect(createdEventType).toHaveProperty("id");
        expect(createdEventType.title).toEqual(createPayload.title);
        expect(createdEventType.slug).toEqual(createPayload.slug);
        expect(createdEventType.lengthInMinutes).toEqual(createPayload.lengthInMinutes);
        expect(createdEventType.hidden).toBe(true);

        createdEventTypeId = createdEventType.id;
      });

      it("should update the hidden property to false", async () => {
        const updatePayload = {
          hidden: false,
        };

        const response = await request(app.getHttpServer())
          .patch(`/api/v2/event-types/${createdEventTypeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
          .send(updatePayload)
          .expect(200);

        const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14> = response.body;
        const updatedEventType = responseBody.data;
        expect(updatedEventType.hidden).toBe(false);
      });
    });

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      try {
        await eventTypesRepositoryFixture.delete(legacyEventTypeId1);
      } catch (e) {
        console.log(e);
      }
      try {
        await userRepositoryFixture.delete(user.id);
      } catch (e) {
        console.log(e);
      }
      await app.close();
    });
  });
});