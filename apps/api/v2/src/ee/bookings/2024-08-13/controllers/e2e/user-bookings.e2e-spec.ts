import {
  CAL_API_VERSION_HEADER,
  SUCCESS_STATUS,
  VERSION_2024_06_14,
  VERSION_2024_08_13,
  X_CAL_CLIENT_ID,
} from "@calcom/platform-constants";
import { EventManager } from "@calcom/platform-libraries/event-types";
import type {
  BookingOutput_2024_08_13,
  CancelBookingInput_2024_08_13,
  CreateBookingInput_2024_08_13,
  CreateEventTypeInput_2024_06_14,
  CreateRecurringBookingInput_2024_08_13,
  GetBookingOutput_2024_08_13,
  GetBookingsOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
  MarkAbsentBookingInput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
} from "@calcom/platform-types";
import { FAILED_EVENT_TYPE_IDENTIFICATION_ERROR_MESSAGE } from "@calcom/platform-types";
import type { Booking, EventType, PlatformOAuthClient, Team, User, Workflow } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { advanceTo, clear } from "jest-date-mock";
import request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { WorkflowRepositoryFixture } from "test/fixtures/repository/workflow.repository.fixture";
import { WorkflowReminderRepositoryFixture } from "test/fixtures/repository/workflow-reminder.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CancelBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/cancel-booking.output";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { MarkAbsentBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/mark-absent.output";
import { RescheduleBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/reschedule-booking.output";
import { CalVideoService } from "@/ee/bookings/2024-08-13/services/cal-video.service";
import { CreateEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/create-event-type.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Bookings Endpoints 2024-08-13", () => {
  describe("User bookings", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let workflowReminderRepositoryFixture: WorkflowReminderRepositoryFixture;
    let workflowRepositoryFixture: WorkflowRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let teamRepositoryFixture: TeamRepositoryFixture;

    const userEmail = `user-bookings-user-${randomString()}@api.com`;
    let user: User;

    let eventTypeId: number;
    let eventType: EventType;
    let eventTypeWithAttendeeSmsReminder: EventType;
    let workflow: Workflow;
    const eventTypeSlug = `user-bookings-event-type-${randomString()}`;
    let recurringEventTypeId: number;
    const recurringEventTypeSlug = `user-bookings-event-type-${randomString()}`;
    let eventTypeRequiresConfirmationId: number;
    const eventTypeRequiresConfirmationSlug = `user-bookings-event-type-requires-confirmation-${randomString()}`;

    let createdBooking: BookingOutput_2024_08_13;
    let createdRecurringBooking: RecurringBookingOutput_2024_08_13[];

    let bookingInThePast: Booking;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, SchedulesModule_2024_04_15],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);
      workflowReminderRepositoryFixture = new WorkflowReminderRepositoryFixture(moduleRef);
      workflowRepositoryFixture = new WorkflowRepositoryFixture(moduleRef);

      organization = await teamRepositoryFixture.create({
        name: `user-bookings-organization-${randomString()}`,
        isOrganization: true,
      });
      oAuthClient = await createOAuthClient(organization.id);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `user-bookings-2024-08-13-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);

      const event = await eventTypesRepositoryFixture.create(
        {
          title: `user-bookings-2024-08-13-event-type-${randomString()}`,
          slug: eventTypeSlug,
          length: 60,
        },
        user.id
      );
      eventTypeId = event.id;
      eventType = event;

      const recurringEvent = await eventTypesRepositoryFixture.create(
        // note(Lauris): freq 2 means weekly, interval 1 means every week and count 3 means 3 weeks in a row
        {
          title: "peer coding recurring",
          slug: recurringEventTypeSlug,
          length: 60,
          recurringEvent: { freq: 2, count: 3, interval: 1 },
        },
        user.id
      );
      recurringEventTypeId = recurringEvent.id;

      const eventTypeRequiresConfirmation = await eventTypesRepositoryFixture.create(
        {
          title: `user-bookings-2024-08-13-event-type-requires-confirmation-${randomString()}`,
          slug: eventTypeRequiresConfirmationSlug,
          length: 60,
          requiresConfirmation: true,
        },
        user.id
      );
      eventTypeRequiresConfirmationId = eventTypeRequiresConfirmation.id;

      bookingInThePast = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: user.id,
          },
        },
        startTime: new Date(Date.UTC(2020, 0, 8, 13, 0, 0)),
        endTime: new Date(Date.UTC(2020, 0, 8, 14, 0, 0)),
        title: "peer coding lets goo",
        uid: `booking-in-the-past-${randomString()}`,
        eventType: {
          connect: {
            id: eventTypeId,
          },
        },
        location: "integrations:daily",
        customInputs: {},
        metadata: {},
        responses: {
          name: "Oldie",
          email: "oldie@gmail.com",
        },
        attendees: {
          create: {
            email: "oldie@gmail.com",
            name: "Oldie",
            locale: "lv",
            timeZone: "Europe/Rome",
          },
        },
        rating: 10,
      });

      workflow = await workflowRepositoryFixture.create({
        user: {
          connect: {
            id: user.id,
          },
        },
        trigger: "BEFORE_EVENT",
        time: 24,
        timeUnit: "HOUR",
        position: 0,
        isActiveOnAll: false,
        name: "Attendee SMS Reminder",
        steps: {
          create: {
            stepNumber: 1,
            action: "SMS_ATTENDEE",
            sendTo: null,
            reminderBody:
              "Hi {ATTENDEE}, this is a reminder that your meeting ({EVENT_NAME}) with {ORGANIZER} is on {EVENT_DATE_YYYY MMM D} at {EVENT_TIME_h:mma} {TIMEZONE}.",
            emailSubject: "Reminder: {EVENT_NAME} - {EVENT_DATE_ddd, MMM D, YYYY h:mma}",
            template: "REMINDER",
            numberRequired: true,
            sender: "Cal",
            numberVerificationPending: false,
            includeCalendarEvent: false,
            verifiedAt: new Date(),
          },
        },
      });

      eventTypeWithAttendeeSmsReminder = await eventTypesRepositoryFixture.create(
        {
          title: "event with attendee sms reminder",
          slug: "event-with-attendee-sms-reminder",
          length: 15,
          bookingFields: [
            {
              name: "smsReminderNumber",
              type: "phone",
              sources: [
                {
                  id: String(workflow.id),
                  type: "workflow",
                  label: "Workflow",
                  editUrl: `/workflows/${workflow.id}`,
                  fieldRequired: true,
                },
              ],
              editable: "system",
              required: true,
              defaultLabel: "number_text_notifications",
              defaultPlaceholder: "enter_phone_number",
            },
          ],
          metadata: {
            disableStandardEmails: {
              all: {
                attendee: true,
                host: true,
              },
              confirmation: {
                host: true,
                attendee: true,
              },
            },
          },
          workflows: {
            create: {
              workflow: {
                connect: {
                  id: workflow.id,
                },
              },
            },
          },
        },
        user.id
      );

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    async function createOAuthClient(organizationId: number) {
      const data = {
        logo: "logo-url",
        name: "name",
        redirectUris: ["http://localhost:5555"],
        permissions: 32,
      };
      const secret = "secret";

      const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
      return client;
    }

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
    });

    describe("create bookings", () => {
      describe("invalid metadata", () => {
        it("should not be able to create a booking with metadata with more than 50 keys", async () => {
          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
            eventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
            location: "https://meet.google.com/abc-def-ghi",
            bookingFieldsResponses: {
              customField: "customValue",
            },
            metadata: {
              key1: "1",
              key2: "2",
              key3: "3",
              key4: "4",
              key5: "5",
              key6: "6",
              key7: "7",
              key8: "8",
              key9: "9",
              key10: "10",
              key11: "11",
              key12: "12",
              key13: "13",
              key14: "14",
              key15: "15",
              key16: "16",
              key17: "17",
              key18: "18",
              key19: "19",
              key20: "20",
              key21: "21",
              key22: "22",
              key23: "23",
              key24: "24",
              key25: "25",
              key26: "26",
              key27: "27",
              key28: "28",
              key29: "29",
              key30: "30",
              key31: "31",
              key32: "32",
              key33: "33",
              key34: "34",
              key35: "35",
              key36: "36",
              key37: "37",
              key38: "38",
              key39: "39",
              key40: "40",
              key41: "41",
              key42: "42",
              key43: "43",
              key44: "44",
              key45: "45",
              key46: "46",
              key47: "47",
              key48: "48",
              key49: "49",
              key50: "50",
              key51: "51",
            },
          };

          return request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(400);
        });

        it("should not be able to create a booking with metadata with a key longer than 40 characters", async () => {
          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
            eventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
            location: "https://meet.google.com/abc-def-ghi",
            bookingFieldsResponses: {
              customField: "customValue",
            },
            metadata: {
              aaaaaaaaaabbbbbbbbbbccccccccccdddddddddde: "1",
            },
          };

          return request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(400);
        });

        it("should not be able to create a booking with metadata with a value longer than 500 characters", async () => {
          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
            eventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
            location: "https://meet.google.com/abc-def-ghi",
            bookingFieldsResponses: {
              customField: "customValue",
            },
            metadata: {
              key: `${"a".repeat(501)}`,
            },
          };

          return request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(400);
        });
      });

      it("should create a booking", async () => {
        const googleMeetUrl = "https://meet.google.com/abc-def-ghi";
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
          eventTypeId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: googleMeetUrl,
          bookingFieldsResponses: {
            customField: "customValue",
          },
          metadata: {
            userId: "100",
          },
          guests: ["bob@gmail.com"],
        };

        const beforeCreate = new Date();
        return request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201)
          .then(async (response) => {
            const afterCreate = new Date();
            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.hosts[0].id).toEqual(user.id);
              expect(data.hosts[0].username).toEqual(user.username);
              expect(data.hosts[0].email).toEqual(user.email);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 8, 14, 0, 0)).toISOString());
              expect(data.duration).toEqual(60);
              expect(data.eventTypeId).toEqual(eventTypeId);
              expect(data.eventType).toEqual({
                id: eventTypeId,
                slug: eventTypeSlug,
              });
              expect(data.attendees[0]).toEqual({
                name: body.attendee.name,
                email: body.attendee.email,
                displayEmail: body.attendee.email,
                timeZone: body.attendee.timeZone,
                language: body.attendee.language,
                absent: false,
              });
              expect(data.location).toEqual(body.location);
              expect(data.meetingUrl).toEqual(body.location);
              expect(data.absentHost).toEqual(false);
              expect(data.bookingFieldsResponses).toEqual({
                name: body.attendee.name,
                email: body.attendee.email,
                displayEmail: body.attendee.email,
                ...body.bookingFieldsResponses,
                guests: body.guests,
                displayGuests: body.guests,
                location: {
                  optionValue: googleMeetUrl,
                  value: "link",
                },
              });
              expect(data.guests).toEqual(body.guests);

              // Check createdAt date is between the time of the request and after the request
              const createdAtDate = new Date(data.createdAt);
              expect(createdAtDate.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
              expect(createdAtDate.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

              // Check updatedAt date is between the time of the request and after the request
              expect(data.updatedAt).toBeDefined();
              const updatedAtDate = data.updatedAt ? new Date(data.updatedAt) : null;
              expect(updatedAtDate?.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
              expect(updatedAtDate?.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

              expect(data.metadata).toEqual(body.metadata);
              createdBooking = data;
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should create a recurring booking", async () => {
        const body: CreateRecurringBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 1, 4, 13, 0, 0)).toISOString(),
          eventTypeId: recurringEventTypeId,
          attendee: {
            name: "Mr Proper Recurring",
            email: "mr_proper_recurring@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: "https://meet.google.com/abc-def-ghi",
          metadata: {
            userId: "1000",
          },
        };

        return request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsRecurringBooking(responseBody.data)).toBe(true);

            if (responseDataIsRecurringBooking(responseBody.data)) {
              const data: RecurringBookingOutput_2024_08_13[] = responseBody.data;
              expect(data.length).toEqual(3);

              const firstBooking = data[0];
              expect(firstBooking.id).toBeDefined();
              expect(firstBooking.uid).toBeDefined();
              expect(firstBooking.hosts[0].id).toEqual(user.id);
              expect(firstBooking.status).toEqual("accepted");
              expect(firstBooking.start).toEqual(new Date(Date.UTC(2030, 1, 4, 13, 0, 0)).toISOString());
              expect(firstBooking.end).toEqual(new Date(Date.UTC(2030, 1, 4, 14, 0, 0)).toISOString());
              expect(firstBooking.duration).toEqual(60);
              expect(firstBooking.eventTypeId).toEqual(recurringEventTypeId);
              expect(firstBooking.attendees[0]).toEqual({
                name: body.attendee.name,
                email: body.attendee.email,
                displayEmail: body.attendee.email,
                timeZone: body.attendee.timeZone,
                language: body.attendee.language,
                absent: false,
              });
              expect(firstBooking.location).toEqual(body.location);
              expect(firstBooking.recurringBookingUid).toBeDefined();
              expect(firstBooking.absentHost).toEqual(false);
              expect(firstBooking.metadata).toEqual(body.metadata);

              const secondBooking = data[1];
              expect(secondBooking.id).toBeDefined();
              expect(secondBooking.uid).toBeDefined();
              expect(secondBooking.hosts[0].id).toEqual(user.id);
              expect(secondBooking.status).toEqual("accepted");
              expect(secondBooking.start).toEqual(new Date(Date.UTC(2030, 1, 11, 13, 0, 0)).toISOString());
              expect(secondBooking.end).toEqual(new Date(Date.UTC(2030, 1, 11, 14, 0, 0)).toISOString());
              expect(secondBooking.duration).toEqual(60);
              expect(secondBooking.eventTypeId).toEqual(recurringEventTypeId);
              expect(secondBooking.recurringBookingUid).toBeDefined();
              expect(secondBooking.attendees[0]).toEqual({
                name: body.attendee.name,
                email: body.attendee.email,
                displayEmail: body.attendee.email,
                timeZone: body.attendee.timeZone,
                language: body.attendee.language,
                absent: false,
              });
              expect(secondBooking.location).toEqual(body.location);
              expect(secondBooking.absentHost).toEqual(false);
              expect(secondBooking.metadata).toEqual(body.metadata);

              const thirdBooking = data[2];
              expect(thirdBooking.id).toBeDefined();
              expect(thirdBooking.uid).toBeDefined();
              expect(thirdBooking.hosts[0].id).toEqual(user.id);
              expect(thirdBooking.status).toEqual("accepted");
              expect(thirdBooking.start).toEqual(new Date(Date.UTC(2030, 1, 18, 13, 0, 0)).toISOString());
              expect(thirdBooking.end).toEqual(new Date(Date.UTC(2030, 1, 18, 14, 0, 0)).toISOString());
              expect(thirdBooking.duration).toEqual(60);
              expect(thirdBooking.eventTypeId).toEqual(recurringEventTypeId);
              expect(thirdBooking.recurringBookingUid).toBeDefined();
              expect(thirdBooking.attendees[0]).toEqual({
                name: body.attendee.name,
                email: body.attendee.email,
                displayEmail: body.attendee.email,
                timeZone: body.attendee.timeZone,
                language: body.attendee.language,
                absent: false,
              });
              expect(thirdBooking.location).toEqual(body.location);
              expect(thirdBooking.absentHost).toEqual(false);
              expect(thirdBooking.metadata).toEqual(body.metadata);

              createdRecurringBooking = data;
            } else {
              throw new Error(
                "Invalid response data - expected recurring booking but received non array response"
              );
            }
          });
      });
    });

    describe("get individual booking", () => {
      it("should get a booking", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings/${createdBooking.uid}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toEqual(createdBooking.id);
              expect(data.uid).toEqual(createdBooking.uid);
              expect(data.hosts[0].id).toEqual(user.id);
              expect(data.hosts[0].username).toEqual(user.username);
              expect(data.hosts[0].email).toEqual(user.email);
              expect(data.status).toEqual(createdBooking.status);
              expect(data.start).toEqual(createdBooking.start);
              expect(data.end).toEqual(createdBooking.end);
              expect(data.duration).toEqual(createdBooking.duration);
              expect(data.eventTypeId).toEqual(createdBooking.eventTypeId);
              expect(data.attendees[0]).toEqual(createdBooking.attendees[0]);
              expect(data.location).toEqual(createdBooking.location);
              expect(data.absentHost).toEqual(createdBooking.absentHost);
              expect(data.createdAt).toEqual(createdBooking.createdAt);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should get a booking with rating", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings/${bookingInThePast.uid}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toEqual(bookingInThePast.id);
              expect(data.uid).toEqual(bookingInThePast.uid);
              expect(data.rating).toEqual(bookingInThePast.rating);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should get a booking with icsUid", async () => {
        const mockBooking = await bookingsRepositoryFixture.create({
          user: {
            connect: {
              id: user.id,
            },
          },
          startTime: new Date(Date.UTC(2020, 0, 8, 13, 0, 0)),
          endTime: new Date(Date.UTC(2020, 0, 8, 14, 0, 0)),
          title: "peer coding lets goo",
          uid: `booking-in-the-past-${randomString()}`,
          eventType: {
            connect: {
              id: eventTypeId,
            },
          },
          location: "integrations:daily",
          customInputs: {},
          metadata: {},
          responses: {
            name: "Oldie",
            email: "oldie@gmail.com",
          },
          attendees: {
            create: {
              email: "oldie@gmail.com",
              name: "Oldie",
              locale: "lv",
              timeZone: "Europe/Rome",
            },
          },
          rating: 10,
          iCalUID: "ics-uid",
        });

        return request(app.getHttpServer())
          .get(`/v2/bookings/${mockBooking.uid}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toEqual(mockBooking.id);
              expect(data.uid).toEqual(mockBooking.uid);
              expect(data.icsUid).toEqual(mockBooking.iCalUID);
              await bookingsRepositoryFixture.deleteById(mockBooking.id);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should get 1 recurrence of a recurring booking", async () => {
        const recurrenceUid = createdRecurringBooking[0].uid;
        return request(app.getHttpServer())
          .get(`/v2/bookings/${recurrenceUid}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsRecurranceBooking(responseBody.data)).toBe(true);

            if (responseDataIsRecurranceBooking(responseBody.data)) {
              const data: RecurringBookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toEqual(createdRecurringBooking[0].id);
              expect(data.uid).toEqual(createdRecurringBooking[0].uid);
              expect(data.hosts[0].id).toEqual(user.id);
              expect(data.hosts[0].username).toEqual(user.username);
              expect(data.hosts[0].email).toEqual(user.email);
              expect(data.status).toEqual(createdRecurringBooking[0].status);
              expect(data.start).toEqual(createdRecurringBooking[0].start);
              expect(data.end).toEqual(createdRecurringBooking[0].end);
              expect(data.duration).toEqual(createdRecurringBooking[0].duration);
              expect(data.eventTypeId).toEqual(createdRecurringBooking[0].eventTypeId);
              expect(data.recurringBookingUid).toEqual(createdRecurringBooking[0].recurringBookingUid);
              expect(data.attendees[0]).toEqual(createdRecurringBooking[0].attendees[0]);
              expect(data.location).toEqual(createdRecurringBooking[0].location);
              expect(data.absentHost).toEqual(createdRecurringBooking[0].absentHost);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should get all recurrences of the recurring bookings", async () => {
        const recurringBookingUid = createdRecurringBooking[0].recurringBookingUid;
        return request(app.getHttpServer())
          .get(`/v2/bookings/${recurringBookingUid}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsRecurringBooking(responseBody.data)).toBe(true);

            if (responseDataIsRecurringBooking(responseBody.data)) {
              const data: RecurringBookingOutput_2024_08_13[] = responseBody.data;
              expect(data.length).toEqual(3);

              const firstBooking = data[0];
              expect(firstBooking.id).toEqual(createdRecurringBooking[0].id);
              expect(firstBooking.uid).toEqual(createdRecurringBooking[0].uid);
              expect(firstBooking.hosts[0].id).toEqual(user.id);
              expect(firstBooking.status).toEqual(createdRecurringBooking[0].status);
              expect(firstBooking.start).toEqual(createdRecurringBooking[0].start);
              expect(firstBooking.end).toEqual(createdRecurringBooking[0].end);
              expect(firstBooking.duration).toEqual(createdRecurringBooking[0].duration);
              expect(firstBooking.eventTypeId).toEqual(createdRecurringBooking[0].eventTypeId);
              expect(firstBooking.recurringBookingUid).toEqual(recurringBookingUid);
              expect(firstBooking.attendees[0]).toEqual(createdRecurringBooking[0].attendees[0]);
              expect(firstBooking.location).toEqual(createdRecurringBooking[0].location);
              expect(firstBooking.absentHost).toEqual(createdRecurringBooking[0].absentHost);

              const secondBooking = data[1];
              expect(secondBooking.id).toEqual(createdRecurringBooking[1].id);
              expect(secondBooking.uid).toEqual(createdRecurringBooking[1].uid);
              expect(secondBooking.hosts[0].id).toEqual(user.id);
              expect(secondBooking.status).toEqual(createdRecurringBooking[1].status);
              expect(secondBooking.start).toEqual(createdRecurringBooking[1].start);
              expect(secondBooking.end).toEqual(createdRecurringBooking[1].end);
              expect(secondBooking.duration).toEqual(createdRecurringBooking[1].duration);
              expect(secondBooking.eventTypeId).toEqual(createdRecurringBooking[1].eventTypeId);
              expect(secondBooking.recurringBookingUid).toEqual(recurringBookingUid);
              expect(secondBooking.attendees[0]).toEqual(createdRecurringBooking[1].attendees[0]);
              expect(secondBooking.location).toEqual(createdRecurringBooking[1].location);
              expect(secondBooking.absentHost).toEqual(createdRecurringBooking[1].absentHost);

              const thirdBooking = data[2];
              expect(thirdBooking.id).toEqual(createdRecurringBooking[2].id);
              expect(thirdBooking.uid).toEqual(createdRecurringBooking[2].uid);
              expect(thirdBooking.hosts[0].id).toEqual(user.id);
              expect(thirdBooking.status).toEqual(createdRecurringBooking[2].status);
              expect(thirdBooking.start).toEqual(createdRecurringBooking[2].start);
              expect(thirdBooking.end).toEqual(createdRecurringBooking[2].end);
              expect(thirdBooking.duration).toEqual(createdRecurringBooking[2].duration);
              expect(thirdBooking.eventTypeId).toEqual(createdRecurringBooking[2].eventTypeId);
              expect(thirdBooking.recurringBookingUid).toEqual(recurringBookingUid);
              expect(thirdBooking.attendees[0]).toEqual(createdRecurringBooking[2].attendees[0]);
              expect(thirdBooking.location).toEqual(createdRecurringBooking[2].location);
              expect(thirdBooking.absentHost).toEqual(createdRecurringBooking[2].absentHost);

              createdRecurringBooking = data;
            } else {
              throw new Error(
                "Invalid response data - expected recurring booking but received non array response"
              );
            }
          });
      });
    });

    describe("get bookings", () => {
      it("should get all bookings", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(5);
          });
      });

      it("should take bookings", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?take=3`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(3);
          });
      });

      it("should skip bookings", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?skip=2`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(3);
          });
      });

      it("should get upcoming bookings", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?status=upcoming`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(4);
          });
      });

      it("should get past bookings", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?status=past`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(1);
          });
      });

      it("should get upcoming and past bookings", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?status=upcoming,past`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(5);
          });
      });

      it("should get recurring booking recurrences", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?status=recurring`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(3);
          });
      });

      it("should get bookings by attendee email", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?attendeeEmail=mr_proper@gmail.com`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(1);
          });
      });

      it("should get bookings by attendee name", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?attendeeName=Mr Proper Recurring`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(3);
          });
      });

      it("should get bookings by eventTypeId", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?eventTypeId=${eventTypeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
          });
      });

      it("should get bookings by eventTypeIds", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?eventTypeIds=${eventTypeId},${recurringEventTypeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(5);
          });
      });

      it("should get bookings by after specified start time", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?afterStart=${createdRecurringBooking[1].start}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
          });
      });

      it("should get bookings by before specified end time", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?beforeEnd=${createdRecurringBooking[0].end}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(3);
          });
      });

      it("should get bookings after specified update time", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?afterUpdatedAt=${createdRecurringBooking[1].updatedAt}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
          });
      });

      it("should get bookings before specified update time", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?beforeUpdatedAt=${createdRecurringBooking[0].updatedAt}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(3);
          });
      });

      it("should get bookings in update range", async () => {
        return request(app.getHttpServer())
          .get(
            `/v2/bookings?afterUpdatedAt=${createdRecurringBooking[0].updatedAt}&beforeUpdatedAt=${createdRecurringBooking[2].updatedAt}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(3);
          });
      });

      describe("createdAt filter", () => {
        it("should get bookings after specified createdAt time", async () => {
          return request(app.getHttpServer())
            .get(`/v2/bookings?afterCreatedAt=${createdRecurringBooking[1].createdAt}`)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(200)
            .then(async (response) => {
              const responseBody: GetBookingsOutput_2024_08_13 = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              expect(responseBody.data).toBeDefined();
              const data: (
                | BookingOutput_2024_08_13
                | RecurringBookingOutput_2024_08_13
                | GetSeatedBookingOutput_2024_08_13
              )[] = responseBody.data;
              expect(data.length).toEqual(2);
            });
        });

        it("should get bookings before specified createdAt time", async () => {
          return request(app.getHttpServer())
            .get(`/v2/bookings?beforeCreatedAt=${createdRecurringBooking[0].createdAt}`)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(200)
            .then(async (response) => {
              const responseBody: GetBookingsOutput_2024_08_13 = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              expect(responseBody.data).toBeDefined();
              const data: (
                | BookingOutput_2024_08_13
                | RecurringBookingOutput_2024_08_13
                | GetSeatedBookingOutput_2024_08_13
              )[] = responseBody.data;
              expect(data.length).toEqual(3);
            });
        });

        it("should get bookings in createdAt range", async () => {
          return request(app.getHttpServer())
            .get(
              `/v2/bookings?afterCreatedAt=${createdRecurringBooking[0].createdAt}&beforeCreatedAt=${createdRecurringBooking[1].createdAt}`
            )
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(200)
            .then(async (response) => {
              const responseBody: GetBookingsOutput_2024_08_13 = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              expect(responseBody.data).toBeDefined();
              const data: (
                | BookingOutput_2024_08_13
                | RecurringBookingOutput_2024_08_13
                | GetSeatedBookingOutput_2024_08_13
              )[] = responseBody.data;
              expect(data.length).toEqual(2);
            });
        });
      });

      it("should sort bookings by start in descending order", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?eventTypeId=${eventTypeId}&sortStart=desc`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
            expect(data[0].start).toEqual(createdBooking.start);
            expect(data[1].start).toEqual(bookingInThePast.startTime.toISOString());
          });
      });

      it("should sort bookings by start in ascending order", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?eventTypeId=${eventTypeId}&sortStart=asc`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
            expect(data[0].start).toEqual(bookingInThePast.startTime.toISOString());
            expect(data[1].start).toEqual(createdBooking.start);
          });
      });

      it("should sort bookings by end in descending order", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?eventTypeId=${eventTypeId}&sortEnd=desc`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
            expect(data[0].start).toEqual(createdBooking.start);
            expect(data[1].start).toEqual(bookingInThePast.startTime.toISOString());
          });
      });

      it("should sort bookings by end in ascending order", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?eventTypeId=${eventTypeId}&sortEnd=asc`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
            expect(data[0].start).toEqual(bookingInThePast.startTime.toISOString());
            expect(data[1].start).toEqual(createdBooking.start);
          });
      });

      it("should sort bookings by created in descending order", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?eventTypeId=${eventTypeId}&sortCreated=desc`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
            expect(data[0].start).toEqual(createdBooking.start);
            expect(data[1].start).toEqual(bookingInThePast.startTime.toISOString());
          });
      });

      it("should sort bookings by created in ascending order", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?eventTypeId=${eventTypeId}&sortCreated=asc`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
            expect(data[0].start).toEqual(bookingInThePast.startTime.toISOString());
            expect(data[1].start).toEqual(createdBooking.start);
          });
      });

      it("should sort bookings by updated in descending order", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?eventTypeId=${eventTypeId}&sortUpdatedAt=desc`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
            expect(data[0].updatedAt).toEqual(createdBooking.updatedAt);
            expect(data[1].updatedAt).toEqual(bookingInThePast.updatedAt?.toISOString());
          });
      });

      it("should sort bookings by updated in ascending order", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?eventTypeId=${eventTypeId}&sortUpdatedAt=asc`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
            expect(data[0].updatedAt).toEqual(bookingInThePast.updatedAt?.toISOString());
            expect(data[1].updatedAt).toEqual(createdBooking.updatedAt);
          });
      });
    });

    describe("rescheduling bookings", () => {
      describe("cant't reschedule cancelled or rescheduled booking booking", () => {
        it("should not be able to reschedule cancelled booking", async () => {
          const cancelledBooking = await bookingsRepositoryFixture.create({
            status: "CANCELLED",
            user: {
              connect: {
                id: user.id,
              },
            },
            startTime: new Date(Date.UTC(2050, 0, 8, 13, 0, 0)),
            endTime: new Date(Date.UTC(2050, 0, 8, 14, 0, 0)),
            title: "peer coding lets goo",
            uid: `cancelled-booking-${randomString()}`,
            eventType: {
              connect: {
                id: eventTypeId,
              },
            },
            location: "integrations:daily",
            customInputs: {},
            metadata: {},
            responses: {
              name: "Oldie",
              email: "oldie@gmail.com",
            },
            attendees: {
              create: {
                email: "oldie@gmail.com",
                name: "Oldie",
                locale: "lv",
                timeZone: "Europe/Rome",
              },
            },
          });

          const body: RescheduleBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2040, 0, 9, 14, 0, 0)).toISOString(),
            reschedulingReason: "Flying to mars that day",
          };

          const response = await request(app.getHttpServer())
            .post(`/v2/bookings/${cancelledBooking.uid}/reschedule`)
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(400);

          expect(response.body.error.message).toEqual(
            `Can't reschedule booking with uid=${cancelledBooking.uid} because it has been cancelled. Please provide uid of a booking that is not cancelled.`
          );
          await bookingsRepositoryFixture.deleteById(cancelledBooking.id);
        });

        it("should not be able to reschedule rescheduled booking", async () => {
          const rescheduledBooking = await bookingsRepositoryFixture.create({
            status: "CANCELLED",
            rescheduled: true,
            user: {
              connect: {
                id: user.id,
              },
            },
            startTime: new Date(Date.UTC(2050, 0, 8, 13, 0, 0)),
            endTime: new Date(Date.UTC(2050, 0, 8, 14, 0, 0)),
            title: "peer coding lets goo",
            uid: `cancelled-booking-${randomString()}`,
            eventType: {
              connect: {
                id: eventTypeId,
              },
            },
            location: "integrations:daily",
            customInputs: {},
            metadata: {},
            responses: {
              name: "Oldie",
              email: "oldie@gmail.com",
            },
            attendees: {
              create: {
                email: "oldie@gmail.com",
                name: "Oldie",
                locale: "lv",
                timeZone: "Europe/Rome",
              },
            },
          });

          const newBooking = await bookingsRepositoryFixture.create({
            status: "ACCEPTED",
            user: {
              connect: {
                id: user.id,
              },
            },
            fromReschedule: rescheduledBooking.uid,
            startTime: new Date(Date.UTC(2050, 0, 8, 13, 0, 0)),
            endTime: new Date(Date.UTC(2050, 0, 8, 14, 0, 0)),
            title: "peer coding lets goo",
            uid: `new-booking-${randomString()}`,
            eventType: {
              connect: {
                id: eventTypeId,
              },
            },
            location: "integrations:daily",
            customInputs: {},
            metadata: {},
            responses: {
              name: "Oldie",
              email: "oldie@gmail.com",
            },
            attendees: {
              create: {
                email: "oldie@gmail.com",
                name: "Oldie",
                locale: "lv",
                timeZone: "Europe/Rome",
              },
            },
          });

          const body: RescheduleBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2040, 0, 9, 14, 0, 0)).toISOString(),
            reschedulingReason: "Flying to mars that day",
          };

          const response = await request(app.getHttpServer())
            .post(`/v2/bookings/${rescheduledBooking.uid}/reschedule`)
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(400);

          expect(response.body.error.message).toEqual(
            `Can't reschedule booking with uid=${rescheduledBooking.uid} because it has been cancelled and rescheduled already to booking with uid=${newBooking.uid}. You probably want to reschedule ${newBooking.uid} instead by passing it within the request URL.`
          );
          await bookingsRepositoryFixture.deleteById(rescheduledBooking.id);
          await bookingsRepositoryFixture.deleteById(newBooking.id);
        });
      });

      describe("recurring booking", () => {
        it("should reschedule recurrence of a recurring booking", async () => {
          const body: RescheduleBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2035, 0, 9, 14, 0, 0)).toISOString(),
            reschedulingReason: "Flying to mars again",
          };

          return request(app.getHttpServer())
            .post(`/v2/bookings/${createdRecurringBooking[0].uid}/reschedule`)
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201)
            .then(async (response) => {
              const responseBody: RescheduleBookingOutput_2024_08_13 = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              expect(responseBody.data).toBeDefined();
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              const data: RecurringBookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.hosts[0].id).toEqual(user.id);
              expect(data.hosts[0].username).toEqual(user.username);
              expect(data.hosts[0].email).toEqual(user.email);
              expect(data.status).toEqual(createdRecurringBooking[0].status);
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2035, 0, 9, 15, 0, 0)).toISOString());
              expect(data.duration).toEqual(createdRecurringBooking[0].duration);
              expect(data.recurringBookingUid).toEqual(createdRecurringBooking[0].recurringBookingUid);
              expect(data.eventTypeId).toEqual(createdRecurringBooking[0].eventTypeId);
              expect(data.attendees[0]).toEqual(createdRecurringBooking[0].attendees[0]);
              expect(data.location).toEqual(createdRecurringBooking[0].location);
              expect(data.absentHost).toEqual(createdRecurringBooking[0].absentHost);
              expect(data.metadata).toEqual(createdRecurringBooking[0].metadata);

              const oldBooking = await bookingsRepositoryFixture.getByUid(createdRecurringBooking[0].uid);
              expect(oldBooking).toBeDefined();
              expect(oldBooking?.status).toEqual("CANCELLED");
            });
        });

        it("should get recurring booking recurrences after rescheduling one", async () => {
          const recurringBookingUid = createdRecurringBooking[0].recurringBookingUid;
          return request(app.getHttpServer())
            .get(`/v2/bookings/${recurringBookingUid}`)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(200)
            .then(async (response) => {
              const responseBody: CreateBookingOutput_2024_08_13 = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              expect(responseBody.data).toBeDefined();
              expect(responseDataIsRecurringBooking(responseBody.data)).toBe(true);

              if (responseDataIsRecurringBooking(responseBody.data)) {
                const data: RecurringBookingOutput_2024_08_13[] = responseBody.data;
                expect(data.length).toEqual(4);
                const cancelled = data.find((booking) => booking.status === "cancelled");
                expect(cancelled).toBeDefined();
                const rescheduledNew = data.find(
                  (booking) => booking.start === new Date(Date.UTC(2035, 0, 9, 14, 0, 0)).toISOString()
                );
                expect(rescheduledNew).toBeDefined();
                createdRecurringBooking = data;
              } else {
                throw new Error(
                  "Invalid response data - expected recurring booking but received non array response"
                );
              }
            });
        });
      });
    });

    describe("mark absent", () => {
      beforeAll(() => {
        advanceTo(new Date(2035, 0, 9, 15, 0, 0));
      });

      afterAll(() => {
        clear();
      });

      it("should mark host absent", async () => {
        const body: MarkAbsentBookingInput_2024_08_13 = {
          host: true,
        };

        return request(app.getHttpServer())
          .post(`/v2/bookings/${createdRecurringBooking[1].uid}/mark-absent`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: MarkAbsentBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            const data: RecurringBookingOutput_2024_08_13 = responseBody.data;
            const booking = createdRecurringBooking[1];
            expect(data.absentHost).toEqual(true);

            expect(data.id).toEqual(booking.id);
            expect(data.uid).toEqual(booking.uid);
            expect(data.hosts[0].id).toEqual(user.id);
            expect(data.hosts[0].username).toEqual(user.username);
            expect(data.hosts[0].email).toEqual(user.email);
            expect(data.status).toEqual(booking.status);
            expect(data.start).toEqual(booking.start);
            expect(data.end).toEqual(booking.end);
            expect(data.duration).toEqual(booking.duration);
            expect(data.eventTypeId).toEqual(booking.eventTypeId);
            expect(data.attendees[0]).toEqual(booking.attendees[0]);
            expect(data.location).toEqual(booking.location);
          });
      });

      it("should mark attendee absent", async () => {
        const body: MarkAbsentBookingInput_2024_08_13 = {
          attendees: [{ email: "mr_proper_recurring@gmail.com", absent: true }],
        };

        return request(app.getHttpServer())
          .post(`/v2/bookings/${createdRecurringBooking[2].uid}/mark-absent`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: MarkAbsentBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            const data: RecurringBookingOutput_2024_08_13 = responseBody.data;
            const booking = createdRecurringBooking[2];

            expect(data.id).toEqual(booking.id);
            expect(data.uid).toEqual(booking.uid);
            expect(data.hosts[0].id).toEqual(user.id);
            expect(data.hosts[0].username).toEqual(user.username);
            expect(data.hosts[0].email).toEqual(user.email);
            expect(data.status).toEqual(booking.status);
            expect(data.start).toEqual(booking.start);
            expect(data.end).toEqual(booking.end);
            expect(data.duration).toEqual(booking.duration);
            expect(data.eventTypeId).toEqual(booking.eventTypeId);
            expect(data.attendees[0].absent).toEqual(true);
            expect(data.absentHost).toEqual(booking.absentHost);
            expect(data.location).toEqual(booking.location);
          });
      });
    });

    describe("cancel bookings", () => {
      afterEach(async () => {
        await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      });

      it("should cancel booking", async () => {
        const createBody: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 15, 0, 0)).toISOString(),
          eventTypeId,
          attendee: {
            name: "Mr Proper Cancel",
            email: "mr_proper_cancel@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: "https://meet.google.com/abc-def-ghi",
          bookingFieldsResponses: {
            customField: "customValue",
          },
          metadata: {
            userId: "100",
          },
        };

        const createResponse = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(createBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set(X_CAL_CLIENT_ID, oAuthClient.id)
          .expect(201);

        const createResponseBody: CreateBookingOutput_2024_08_13 = createResponse.body;
        expect(responseDataIsBooking(createResponseBody.data)).toBe(true);

        if (!responseDataIsBooking(createResponseBody.data)) {
          throw new Error("Failed to create booking for test");
        }

        const testBooking: BookingOutput_2024_08_13 = createResponseBody.data;

        const booking = await bookingsRepositoryFixture.getByUid(testBooking.uid);
        expect(booking).toBeDefined();
        expect(booking?.status).toEqual("ACCEPTED");

        const body: CancelBookingInput_2024_08_13 = {
          cancellationReason: "Going on a vacation",
        };

        return request(app.getHttpServer())
          .post(`/v2/bookings/${testBooking.uid}/cancel`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set(X_CAL_CLIENT_ID, oAuthClient.id)
          .expect(200)
          .then(async (response) => {
            const responseBody: CancelBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            const data: BookingOutput_2024_08_13 = responseBody.data;
            expect(data.id).toBeDefined();
            expect(data.uid).toBeDefined();
            expect(data.hosts[0].id).toEqual(user.id);
            expect(data.hosts[0].username).toEqual(user.username);
            expect(data.hosts[0].email).toEqual(user.email);
            expect(data.status).toEqual("cancelled");
            expect(data.cancellationReason).toEqual(body.cancellationReason);
            expect(data.start).toEqual(testBooking.start);
            expect(data.end).toEqual(testBooking.end);
            expect(data.duration).toEqual(testBooking.duration);
            expect(data.eventTypeId).toEqual(testBooking.eventTypeId);
            expect(data.attendees[0]).toEqual(testBooking.attendees[0]);
            expect(data.location).toEqual(testBooking.location);
            expect(data.absentHost).toEqual(testBooking.absentHost);

            const cancelledBooking = await bookingsRepositoryFixture.getByUid(testBooking.uid);
            expect(cancelledBooking).toBeDefined();
            expect(cancelledBooking?.status).toEqual("CANCELLED");
          });
      });

      it("should cancel recurring booking", async () => {
        const createBody: CreateRecurringBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 1, 4, 13, 0, 0)).toISOString(),
          eventTypeId: recurringEventTypeId,
          attendee: {
            name: "Mr Proper Recurring Cancel",
            email: "mr_proper_recurring_cancel@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: "https://meet.google.com/abc-def-ghi",
          bookingFieldsResponses: {
            customField: "customValue",
          },
          metadata: {
            userId: "100",
          },
        };

        const createResponse = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(createBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set(X_CAL_CLIENT_ID, oAuthClient.id)
          .expect(201);

        const createResponseBody: CreateBookingOutput_2024_08_13 = createResponse.body;
        expect(responseDataIsRecurringBooking(createResponseBody.data)).toBe(true);

        if (!responseDataIsRecurringBooking(createResponseBody.data)) {
          throw new Error("Failed to create recurring booking for test");
        }

        const testRecurringBooking: RecurringBookingOutput_2024_08_13[] = createResponseBody.data;

        const body: CancelBookingInput_2024_08_13 = {
          cancellationReason: "Going on a vacation",
        };

        return request(app.getHttpServer())
          .post(`/v2/bookings/${testRecurringBooking[1].recurringBookingUid}/cancel`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set(X_CAL_CLIENT_ID, oAuthClient.id)
          .expect(200)
          .then(async (response) => {
            const responseBody: CancelBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsRecurringBooking(responseBody.data)).toBe(true);

            if (responseDataIsRecurringBooking(responseBody.data)) {
              const data: RecurringBookingOutput_2024_08_13[] = responseBody.data;
              expect(data.length).toEqual(3);

              const firstBooking = data[0];
              expect(firstBooking.status).toEqual("cancelled");

              const secondBooking = data[1];
              expect(secondBooking.status).toEqual("cancelled");

              const thirdBooking = data[2];
              expect(thirdBooking.status).toEqual("cancelled");
            } else {
              throw new Error(
                "Invalid response data - expected recurring booking but received non array response"
              );
            }
          });
      });
    });

    describe("who cancelled and rescheduled a booking", () => {
      it("should return who cancelled a booking", async () => {
        const cancelledByEmail = `user-bookings-canceller-${randomString()}@canceller.com`;
        const cancelledBooking = await bookingsRepositoryFixture.create({
          uid: `booking-uid-${eventTypeId}`,
          title: "booking title",
          startTime: "2050-09-05T11:00:00.000Z",
          endTime: "2050-09-05T12:00:00.000Z",
          eventType: {
            connect: {
              id: eventTypeId,
            },
          },
          status: "CANCELLED",
          cancelledBy: cancelledByEmail,
          metadata: {},
          responses: {
            name: "tester",
            email: "tester@example.com",
            guests: [],
          },
          user: {
            connect: {
              id: user.id,
            },
          },
        });

        return request(app.getHttpServer())
          .get(`/v2/bookings/${cancelledBooking.uid}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            await bookingsRepositoryFixture.deleteById(cancelledBooking.id);
            const responseBody: GetBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.uid).toEqual(cancelledBooking.uid);
              expect(data.cancelledByEmail).toEqual(cancelledByEmail);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should return who rescheduled a booking", async () => {
        const rescheduledByEmail = `user-bookings-rescheduler-${randomString()}@rescheduler.com`;
        const rescheduledBooking = await bookingsRepositoryFixture.create({
          uid: `booking-uid-${eventTypeId}`,
          title: "booking title",
          startTime: "2050-09-05T11:00:00.000Z",
          endTime: "2050-09-05T12:00:00.000Z",
          eventType: {
            connect: {
              id: eventTypeId,
            },
          },
          status: "CANCELLED",
          rescheduledBy: rescheduledByEmail,
          metadata: {},
          responses: {
            name: "tester",
            email: "tester@example.com",
            guests: [],
          },
          user: {
            connect: {
              id: user.id,
            },
          },
        });

        return request(app.getHttpServer())
          .get(`/v2/bookings/${rescheduledBooking.uid}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            await bookingsRepositoryFixture.deleteById(rescheduledBooking.id);
            const responseBody: GetBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.uid).toEqual(rescheduledBooking.uid);
              expect(data.rescheduledByEmail).toEqual(rescheduledByEmail);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should return who rescheduled the booking, in the new booking", async () => {
        const rescheduledByEmail = `user-bookings-rescheduler-${randomString()}@rescheduler.com`;
        // Create the original booking that will be rescheduled
        const originalBooking = await bookingsRepositoryFixture.create({
          uid: `original-booking-uid-${eventTypeId}`,
          title: "original booking title",
          startTime: "2050-09-05T10:00:00.000Z",
          endTime: "2050-09-05T11:00:00.000Z",
          eventType: {
            connect: {
              id: eventTypeId,
            },
          },
          status: "CANCELLED",
          rescheduledBy: rescheduledByEmail,
          metadata: {},
          responses: {
            name: "original tester",
            email: "original@example.com",
            guests: [],
          },
          user: {
            connect: {
              id: user.id,
            },
          },
        });

        // Create the new booking that is the result of the reschedule
        const newBooking = await bookingsRepositoryFixture.create({
          uid: `new-booking-uid-${eventTypeId}`,
          title: "rescheduled booking title",
          startTime: "2050-09-05T14:00:00.000Z",
          endTime: "2050-09-05T15:00:00.000Z",
          eventType: {
            connect: {
              id: eventTypeId,
            },
          },
          status: "ACCEPTED",
          fromReschedule: originalBooking.uid,
          metadata: {},
          responses: {
            name: "new tester",
            email: "newtester@example.com",
            guests: [],
          },
          user: {
            connect: {
              id: user.id,
            },
          },
        });

        return request(app.getHttpServer())
          .get(`/v2/bookings/${newBooking.uid}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            // Fetch the original booking to get its rescheduledBy value
            const originalBookingFromDb = await bookingsRepositoryFixture.getByUid(originalBooking.uid);
            const expectedRescheduledBy = originalBookingFromDb?.rescheduledBy;

            await bookingsRepositoryFixture.deleteById(originalBooking.id);
            await bookingsRepositoryFixture.deleteById(newBooking.id);
            const responseBody: GetBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.uid).toEqual(newBooking.uid);
              expect(rescheduledByEmail).toEqual(expectedRescheduledBy);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });
    });

    describe("book by username and event type slug", () => {
      it("should not create a booking by if neither event type id nor username and event type slug provided", async () => {
        const body = {
          start: new Date(Date.UTC(2036, 0, 8, 15, 0, 0)).toISOString(),
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: "https://meet.google.com/abc-def-ghi",
          bookingFieldsResponses: {
            customField: "customValue",
          },
          metadata: {
            userId: "100",
          },
          guests: ["bob@gmail.com"],
        };

        const response = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);

        expect(response.body.error.message.includes(FAILED_EVENT_TYPE_IDENTIFICATION_ERROR_MESSAGE)).toBe(
          true
        );
      });

      it("should create a booking by username and event type slug", async () => {
        const googleMeetUrl = "https://meet.google.com/abc-def-ghi";
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2036, 0, 8, 15, 0, 0)).toISOString(),
          eventTypeSlug: eventType.slug,
          username: user.username || "",
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: googleMeetUrl,
          bookingFieldsResponses: {
            customField: "customValue",
          },
          metadata: {
            userId: "100",
          },
          guests: ["bob@gmail.com"],
        };

        const beforeCreate = new Date();
        return request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201)
          .then(async (response) => {
            const afterCreate = new Date();
            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.hosts[0].id).toEqual(user.id);
              expect(data.hosts[0].username).toEqual(user.username);
              expect(data.hosts[0].email).toEqual(user.email);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2036, 0, 8, 16, 0, 0)).toISOString());
              expect(data.duration).toEqual(60);
              expect(data.eventTypeId).toEqual(eventTypeId);
              expect(data.eventType).toEqual({
                id: eventTypeId,
                slug: eventTypeSlug,
              });
              expect(data.attendees[0]).toEqual({
                name: body.attendee.name,
                email: body.attendee.email,
                displayEmail: body.attendee.email,
                timeZone: body.attendee.timeZone,
                language: body.attendee.language,
                absent: false,
              });
              expect(data.location).toEqual(body.location);
              expect(data.meetingUrl).toEqual(body.location);
              expect(data.absentHost).toEqual(false);
              expect(data.bookingFieldsResponses).toEqual({
                name: body.attendee.name,
                email: body.attendee.email,
                displayEmail: body.attendee.email,
                ...body.bookingFieldsResponses,
                guests: body.guests,
                displayGuests: body.guests,
                location: {
                  optionValue: googleMeetUrl,
                  value: "link",
                },
              });
              expect(data.guests).toEqual(body.guests);

              // Check createdAt date is between the time of the request and after the request
              const createdAtDate = new Date(data.createdAt);
              expect(createdAtDate.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
              expect(createdAtDate.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

              // Check updatedAt date is between the time of the request and after the request
              expect(data.updatedAt).toBeDefined();
              const updatedAtDate = data.updatedAt ? new Date(data.updatedAt) : null;
              expect(updatedAtDate?.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
              expect(updatedAtDate?.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

              expect(data.metadata).toEqual(body.metadata);
              createdBooking = data;
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });
    });

    describe("booking location", () => {
      const address = "123 Main St";
      const link = "https://cal.com/join/123456";
      const phone = "+37121999999";

      let eventTypeWithAllLocationsId: number;
      it("can create event type with all locations except google meet", async () => {
        const eventTypeBody: CreateEventTypeInput_2024_06_14 = {
          title: "book using any location",
          slug: "book-using-any-location",
          lengthInMinutes: 15,
          locations: [
            {
              type: "integration",
              integration: "cal-video",
            },
            {
              type: "address",
              address,
              public: true,
            },
            {
              type: "link",
              link,
              public: true,
            },
            {
              type: "phone",
              phone,
              public: true,
            },
            {
              type: "attendeeAddress",
            },
            {
              type: "attendeePhone",
            },
            {
              type: "attendeeDefined",
            },
          ],
        };

        const eventTypeResponse = await request(app.getHttpServer())
          .post("/api/v2/event-types")
          .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
          .send(eventTypeBody)
          .expect(201);
        const eventTypeResponseBody: CreateEventTypeOutput_2024_06_14 = eventTypeResponse.body;
        const createdEventType = eventTypeResponseBody.data;
        expect(createdEventType).toHaveProperty("id");
        expect(createdEventType.locations).toHaveLength(7);
        expect(createdEventType.locations).toEqual(createdEventType.locations);
        eventTypeWithAllLocationsId = createdEventType.id;
      });

      it("can book with cal video location", async () => {
        const bookingBody: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2040, 0, 9, 13, 0, 0)).toISOString(),
          eventTypeId: eventTypeWithAllLocationsId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: {
            type: "integration",
            integration: "cal-video",
          },
        };

        const bookingResponse = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(bookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201);

        const bookingResponseBody: CreateBookingOutput_2024_08_13 = bookingResponse.body;
        const createdBooking = bookingResponseBody.data;
        expect(createdBooking).toHaveProperty("id");

        if (responseDataIsBooking(createdBooking)) {
          expect(
            createdBooking.location?.startsWith("http") || createdBooking.location === "integrations:daily"
          ).toEqual(true);
          await bookingsRepositoryFixture.deleteById(createdBooking.id);
        } else {
          throw new Error("Unexpected response data type");
        }
      });

      it("can book with address location", async () => {
        const bookingBody: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2040, 0, 9, 13, 0, 0)).toISOString(),
          eventTypeId: eventTypeWithAllLocationsId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: {
            type: "address",
          },
        };

        const bookingResponse = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(bookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201);

        const bookingResponseBody: CreateBookingOutput_2024_08_13 = bookingResponse.body;
        const createdBooking = bookingResponseBody.data;
        expect(createdBooking).toHaveProperty("id");

        if (responseDataIsBooking(createdBooking)) {
          expect(createdBooking.location).toEqual(address);
          await bookingsRepositoryFixture.deleteById(createdBooking.id);
        } else {
          throw new Error("Unexpected response data type");
        }
      });

      it("can book with link location", async () => {
        const bookingBody: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2040, 0, 9, 13, 0, 0)).toISOString(),
          eventTypeId: eventTypeWithAllLocationsId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: {
            type: "link",
          },
        };

        const bookingResponse = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(bookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201);

        const bookingResponseBody: CreateBookingOutput_2024_08_13 = bookingResponse.body;
        const createdBooking = bookingResponseBody.data;
        expect(createdBooking).toHaveProperty("id");

        if (responseDataIsBooking(createdBooking)) {
          expect(createdBooking.location).toEqual(link);
          await bookingsRepositoryFixture.deleteById(createdBooking.id);
        } else {
          throw new Error("Unexpected response data type");
        }
      });

      it("can book with link location", async () => {
        const bookingBody: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2040, 0, 9, 13, 0, 0)).toISOString(),
          eventTypeId: eventTypeWithAllLocationsId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: {
            type: "phone",
          },
        };

        const bookingResponse = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(bookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201);

        const bookingResponseBody: CreateBookingOutput_2024_08_13 = bookingResponse.body;
        const createdBooking = bookingResponseBody.data;
        expect(createdBooking).toHaveProperty("id");

        if (responseDataIsBooking(createdBooking)) {
          expect(createdBooking.location).toEqual(phone);
          await bookingsRepositoryFixture.deleteById(createdBooking.id);
        } else {
          throw new Error("Unexpected response data type");
        }
      });

      it("can book with attendeeAddress location", async () => {
        const attendeeAddress = "123 Example St, City, Valhalla";

        const bookingBody: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2040, 0, 9, 13, 0, 0)).toISOString(),
          eventTypeId: eventTypeWithAllLocationsId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: {
            type: "attendeeAddress",
            address: attendeeAddress,
          },
        };

        const bookingResponse = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(bookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201);

        const bookingResponseBody: CreateBookingOutput_2024_08_13 = bookingResponse.body;
        const createdBooking = bookingResponseBody.data;
        expect(createdBooking).toHaveProperty("id");

        if (responseDataIsBooking(createdBooking)) {
          expect(createdBooking.location).toEqual(attendeeAddress);
          await bookingsRepositoryFixture.deleteById(createdBooking.id);
        } else {
          throw new Error("Unexpected response data type");
        }
      });

      xit("can book with attendeeAddress location", async () => {
        const attendeePhone = "+37120993151";

        const bookingBody: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2040, 0, 9, 13, 0, 0)).toISOString(),
          eventTypeId: eventTypeWithAllLocationsId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: {
            type: "attendeePhone",
            phone: attendeePhone,
          },
        };

        const bookingResponse = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(bookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201);

        const bookingResponseBody: CreateBookingOutput_2024_08_13 = bookingResponse.body;
        const createdBooking = bookingResponseBody.data;
        expect(createdBooking).toHaveProperty("id");

        if (responseDataIsBooking(createdBooking)) {
          expect(createdBooking.location).toEqual(attendeePhone);
          await bookingsRepositoryFixture.deleteById(createdBooking.id);
        } else {
          throw new Error("Unexpected response data type");
        }
      });

      it("can book with attendeeDefined location", async () => {
        const attendeeDefinedLocation = "namek 100";

        const bookingBody: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2040, 0, 9, 13, 0, 0)).toISOString(),
          eventTypeId: eventTypeWithAllLocationsId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: {
            type: "attendeeDefined",
            location: attendeeDefinedLocation,
          },
        };

        const bookingResponse = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(bookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201);

        const bookingResponseBody: CreateBookingOutput_2024_08_13 = bookingResponse.body;
        const createdBooking = bookingResponseBody.data;
        expect(createdBooking).toHaveProperty("id");

        if (responseDataIsBooking(createdBooking)) {
          expect(createdBooking.location).toEqual(attendeeDefinedLocation);
          await bookingsRepositoryFixture.deleteById(createdBooking.id);
        } else {
          throw new Error("Unexpected response data type");
        }
      });

      it("can't book with not location that is not in event type", async () => {
        const bookingBody: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2040, 0, 9, 13, 0, 0)).toISOString(),
          eventTypeId: eventTypeWithAllLocationsId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: {
            type: "integration",
            integration: "google-meet",
          },
        };

        await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(bookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });

      it("can't book with invalid location type", async () => {
        const bookingBody = {
          start: new Date(Date.UTC(2040, 0, 9, 13, 0, 0)).toISOString(),
          eventTypeId: eventTypeWithAllLocationsId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: {
            type: "blablabala",
          },
        };

        await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(bookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });
    });

    describe("create booking with attendee sms reminder", () => {
      it("should not be able create a booking if attendee sms reminder is missing", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 15, 0, 0)).toISOString(),
          eventTypeId: eventTypeWithAttendeeSmsReminder.id,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
        };

        const response = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);

        expect(response.body.error.message).toEqual(
          `Missing attendee phone number - it is required by the event type. Pass it as "attendee.phoneNumber" string in the request.`
        );
      });

      it("should be able create a booking if attendee sms reminder is provided", async () => {
        const phoneNumber = "+37122222222";
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 15, 0, 0)).toISOString(),
          eventTypeId: eventTypeWithAttendeeSmsReminder.id,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
            phoneNumber,
          },
        };

        const response = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201);

        const responseBody: CreateBookingOutput_2024_08_13 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data).toBeDefined();
        expect(responseDataIsBooking(responseBody.data)).toBe(true);

        if (responseDataIsBooking(responseBody.data)) {
          const data: BookingOutput_2024_08_13 = responseBody.data;
          expect(data.id).toBeDefined();
          expect(data.uid).toBeDefined();
          expect(data.hosts.length).toEqual(1);
          expect(data.hosts[0].id).toEqual(user.id);
          expect(data.status).toEqual("accepted");
          expect(data.start).toEqual(body.start);
          expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 8, 15, 15, 0)).toISOString());
          expect(data.duration).toEqual(15);
          expect(data.eventTypeId).toEqual(eventTypeWithAttendeeSmsReminder.id);
          expect(data.attendees.length).toEqual(1);
          expect(data.attendees[0]).toEqual({
            name: body.attendee.name,
            email: body.attendee.email,
            displayEmail: body.attendee.email,
            timeZone: body.attendee.timeZone,
            language: body.attendee.language,
            phoneNumber: body.attendee.phoneNumber,
            absent: false,
          });
          expect(data.bookingFieldsResponses).toEqual({
            name: body.attendee.name,
            email: body.attendee.email,
            displayEmail: body.attendee.email,
            attendeePhoneNumber: body.attendee.phoneNumber,
            smsReminderNumber: body.attendee.phoneNumber,
          });
          const dbBooking = await bookingsRepositoryFixture.getById(data.id);
          expect(dbBooking?.smsReminderNumber).toEqual(phoneNumber);
          const dbWorkflowReminder = await workflowReminderRepositoryFixture.getByBookingUid(data.uid);
          expect(dbWorkflowReminder?.method).toEqual("SMS");
        } else {
          throw new Error("Invalid response data");
        }
      });
    });

    describe("cant't cancel already cancelled booking", () => {
      it("should not be able to cancel alraedy cancelled booking", async () => {
        const cancelledBooking = await bookingsRepositoryFixture.create({
          status: "CANCELLED",
          user: {
            connect: {
              id: user.id,
            },
          },
          startTime: new Date(Date.UTC(2050, 0, 8, 13, 0, 0)),
          endTime: new Date(Date.UTC(2050, 0, 8, 14, 0, 0)),
          title: "peer coding lets goo",
          uid: `cancelled-booking-${randomString()}`,
          eventType: {
            connect: {
              id: eventTypeId,
            },
          },
          location: "integrations:daily",
          customInputs: {},
          metadata: {},
          responses: {
            name: "Oldie",
            email: "oldie@gmail.com",
          },
          attendees: {
            create: {
              email: "oldie@gmail.com",
              name: "Oldie",
              locale: "lv",
              timeZone: "Europe/Rome",
            },
          },
        });

        const body: CancelBookingInput_2024_08_13 = {
          cancellationReason: "Going on a vacation",
        };

        const response = await request(app.getHttpServer())
          .post(`/v2/bookings/${cancelledBooking.uid}/cancel`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set(X_CAL_CLIENT_ID, oAuthClient.id)
          .expect(400);

        expect(response.body.error.message).toEqual(
          `Can't cancel booking with uid=${cancelledBooking.uid} because it has been cancelled already. Please provide uid of a booking that is not cancelled.`
        );
        await bookingsRepositoryFixture.deleteById(cancelledBooking.id);
      });
    });

    describe("cancellation reason and cancelled by returned if null in database", () => {
      it("should return cancellation reason and cancelled by if null in database", async () => {
        const dbBooking = await bookingsRepositoryFixture.create({
          uid: randomString(10),
          title: "test",
          startTime: new Date(Date.UTC(2040, 0, 13, 16, 0, 0)),
          endTime: new Date(Date.UTC(2040, 0, 13, 17, 0, 0)),
          eventType: {
            connect: {
              id: eventTypeId,
            },
          },
          user: {
            connect: {
              id: user.id,
            },
          },
          metadata: {},
          responses: {
            name: "tester",
            email: "tester@example.com",
            guests: [],
          },
          cancellationReason: null,
          cancelledBy: null,
        });

        const response = await request(app.getHttpServer())
          .get(`/v2/bookings/${dbBooking.uid}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200);

        const responseBody: GetBookingOutput_2024_08_13 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data).toBeDefined();
        expect(responseDataIsBooking(responseBody.data)).toBe(true);

        if (responseDataIsBooking(responseBody.data)) {
          const data: BookingOutput_2024_08_13 = responseBody.data;
          expect(data.id).toBeDefined();
          expect(data.cancellationReason).toBe("");
          expect(data.cancelledByEmail).toBe("");
        } else {
          throw new Error(
            "Invalid response data - expected booking but received array of possibly recurring bookings"
          );
        }
      });
    });

    describe("calendar events", () => {
      beforeEach(() => {
        jest.restoreAllMocks();
        jest
          .spyOn(EventManager.prototype, "create")
          .mockImplementation(() => Promise.resolve({ results: [], referencesToCreate: [] }));
        jest
          .spyOn(EventManager.prototype, "createAllCalendarEvents")
          .mockImplementation(() => Promise.resolve([]));
        jest
          .spyOn(EventManager.prototype, "createAllCRMEvents")
          .mockImplementation(() => Promise.resolve([]));
      });

      describe("platform oAuth client has calendar events enabled", () => {
        beforeAll(async () => {
          await oauthClientRepositoryFixture.update(oAuthClient.id, {
            areCalendarEventsEnabled: true,
          });
        });

        it("should create calendar event when booking normal event", async () => {
          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2040, 0, 9, 9, 0, 0)).toISOString(),
            eventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
          };

          return request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201)
            .then(async (response) => {
              const responseBody: CreateBookingOutput_2024_08_13 = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              expect(responseBody.data).toBeDefined();
              expect(responseDataIsBooking(responseBody.data)).toBe(true);

              if (responseDataIsBooking(responseBody.data)) {
                const data: BookingOutput_2024_08_13 = responseBody.data;
                expect(data.id).toBeDefined();
                expect(data.uid).toBeDefined();
                expect(EventManager.prototype.create).toHaveBeenCalledTimes(1);
              } else {
                throw new Error(
                  "Invalid response data - expected booking but received array of possibly recurring bookings"
                );
              }
            });
        });

        it("should create calendar events when booking recurring event", async () => {
          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2040, 0, 10, 9, 0, 0)).toISOString(),
            eventTypeId: recurringEventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
          };

          return request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201)
            .then(async (response) => {
              const responseBody: CreateBookingOutput_2024_08_13 = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              expect(responseBody.data).toBeDefined();
              expect(EventManager.prototype.create).toHaveBeenCalledTimes(3);
            });
        });

        describe("event type requires confirmation", () => {
          let bookingThatRequiresConfirmationUid: string;

          it("should not create calendar event when booking event that requires confirmation", async () => {
            const body: CreateBookingInput_2024_08_13 = {
              start: new Date(Date.UTC(2040, 0, 12, 9, 0, 0)).toISOString(),
              eventTypeId: eventTypeRequiresConfirmationId,
              attendee: {
                name: "Mr Proper",
                email: "mr_proper@gmail.com",
                timeZone: "Europe/Rome",
                language: "it",
              },
            };

            return request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .expect(201)
              .then(async (response) => {
                const responseBody: CreateBookingOutput_2024_08_13 = response.body;
                expect(responseBody.status).toEqual(SUCCESS_STATUS);
                expect(responseBody.data).toBeDefined();
                expect(responseDataIsBooking(responseBody.data)).toBe(true);

                if (responseDataIsBooking(responseBody.data)) {
                  const data: BookingOutput_2024_08_13 = responseBody.data;
                  expect(data.id).toBeDefined();
                  expect(data.uid).toBeDefined();
                  expect(EventManager.prototype.create).toHaveBeenCalledTimes(0);
                  bookingThatRequiresConfirmationUid = data.uid;
                } else {
                  throw new Error(
                    "Invalid response data - expected booking but received array of possibly recurring bookings"
                  );
                }
              });
          });

          it("should create calendar event when confirming event that requires confirmation", async () => {
            return request(app.getHttpServer())
              .post(`/v2/bookings/${bookingThatRequiresConfirmationUid}/confirm`)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .expect(200)
              .then(async (response) => {
                const responseBody: CreateBookingOutput_2024_08_13 = response.body;
                expect(responseBody.status).toEqual(SUCCESS_STATUS);
                expect(responseBody.data).toBeDefined();
                expect(responseDataIsBooking(responseBody.data)).toBe(true);

                if (responseDataIsBooking(responseBody.data)) {
                  const data: BookingOutput_2024_08_13 = responseBody.data;
                  expect(data.id).toBeDefined();
                  expect(data.uid).toBeDefined();
                  expect(EventManager.prototype.create).toHaveBeenCalledTimes(1);
                } else {
                  throw new Error(
                    "Invalid response data - expected booking but received array of possibly recurring bookings"
                  );
                }
              });
          });
        });
      });

      describe("platform oAuth client has calendar events disabled", () => {
        beforeAll(async () => {
          await oauthClientRepositoryFixture.update(oAuthClient.id, {
            areCalendarEventsEnabled: false,
          });
        });

        it("should not create calendar event when booking", async () => {
          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2040, 0, 9, 10, 0, 0)).toISOString(),
            eventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
          };

          return request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201)
            .then(async (response) => {
              const responseBody: CreateBookingOutput_2024_08_13 = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              expect(responseBody.data).toBeDefined();
              expect(responseDataIsBooking(responseBody.data)).toBe(true);

              if (responseDataIsBooking(responseBody.data)) {
                const data: BookingOutput_2024_08_13 = responseBody.data;
                expect(data.id).toBeDefined();
                expect(data.uid).toBeDefined();
                expect(EventManager.prototype.createAllCalendarEvents).toHaveBeenCalledTimes(0);
                expect(EventManager.prototype.createAllCRMEvents).toHaveBeenCalledTimes(0);
              } else {
                throw new Error(
                  "Invalid response data - expected booking but received array of possibly recurring bookings"
                );
              }
            });
        });

        it("should not create calendar events when booking recurring event", async () => {
          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2040, 0, 11, 10, 0, 0)).toISOString(),
            eventTypeId: recurringEventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
          };

          return request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201)
            .then(async (response) => {
              const responseBody: CreateBookingOutput_2024_08_13 = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              expect(responseBody.data).toBeDefined();
              expect(EventManager.prototype.createAllCalendarEvents).toHaveBeenCalledTimes(0);
              expect(EventManager.prototype.createAllCRMEvents).toHaveBeenCalledTimes(0);
            });
        });

        describe("event type requires confirmation", () => {
          let bookingThatRequiresConfirmationUid: string;

          it("should not create calendar event when booking event that requires confirmation", async () => {
            const body: CreateBookingInput_2024_08_13 = {
              start: new Date(Date.UTC(2040, 0, 12, 10, 0, 0)).toISOString(),
              eventTypeId: eventTypeRequiresConfirmationId,
              attendee: {
                name: "Mr Proper",
                email: "mr_proper@gmail.com",
                timeZone: "Europe/Rome",
                language: "it",
              },
            };

            return request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .expect(201)
              .then(async (response) => {
                const responseBody: CreateBookingOutput_2024_08_13 = response.body;
                expect(responseBody.status).toEqual(SUCCESS_STATUS);
                expect(responseBody.data).toBeDefined();
                expect(responseDataIsBooking(responseBody.data)).toBe(true);

                if (responseDataIsBooking(responseBody.data)) {
                  const data: BookingOutput_2024_08_13 = responseBody.data;
                  expect(data.id).toBeDefined();
                  expect(data.uid).toBeDefined();
                  expect(EventManager.prototype.createAllCalendarEvents).toHaveBeenCalledTimes(0);
                  expect(EventManager.prototype.createAllCRMEvents).toHaveBeenCalledTimes(0);
                  bookingThatRequiresConfirmationUid = data.uid;
                } else {
                  throw new Error(
                    "Invalid response data - expected booking but received array of possibly recurring bookings"
                  );
                }
              });
          });

          it("should not create calendar event when confirming event that requires confirmation", async () => {
            return request(app.getHttpServer())
              .post(`/v2/bookings/${bookingThatRequiresConfirmationUid}/confirm`)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .expect(200)
              .then(async (response) => {
                const responseBody: CreateBookingOutput_2024_08_13 = response.body;
                expect(responseBody.status).toEqual(SUCCESS_STATUS);
                expect(responseBody.data).toBeDefined();
                expect(responseDataIsBooking(responseBody.data)).toBe(true);

                if (responseDataIsBooking(responseBody.data)) {
                  const data: BookingOutput_2024_08_13 = responseBody.data;
                  expect(data.id).toBeDefined();
                  expect(data.uid).toBeDefined();
                  expect(EventManager.prototype.createAllCalendarEvents).toHaveBeenCalledTimes(0);
                  expect(EventManager.prototype.createAllCRMEvents).toHaveBeenCalledTimes(0);
                } else {
                  throw new Error(
                    "Invalid response data - expected booking but received array of possibly recurring bookings"
                  );
                }
              });
          });
        });

        describe("event type with max bookings count per booker", () => {
          it("should not allow booking more than maximumActiveBookings per attendee", async () => {
            const eventTypeIdWithMaxBookerBookings = await eventTypesRepositoryFixture.create(
              {
                slug: `max-bookings-count-per-booker-${randomString(10)}`,
                length: 60,
                title: "Event Type with max bookings count per booker",
                maxActiveBookingsPerBooker: 1,
              },
              user.id
            );

            const body: CreateBookingInput_2024_08_13 = {
              start: new Date(Date.UTC(2040, 0, 13, 10, 0, 0)).toISOString(),
              eventTypeId: eventTypeIdWithMaxBookerBookings.id,
              attendee: {
                name: "alice",
                email: "alice@gmail.com",
                timeZone: "Europe/Rome",
                language: "it",
              },
            };

            const response = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .expect(201);

            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }

            const response2 = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .expect(400);

            expect(response2.body.error.message).toBe(
              "Attendee with this email can't book because the maximum number of active bookings has been reached."
            );

            const body2: CreateBookingInput_2024_08_13 = {
              start: new Date(Date.UTC(2040, 0, 13, 12, 0, 0)).toISOString(),
              eventTypeId: eventTypeIdWithMaxBookerBookings.id,
              attendee: {
                name: "bob",
                email: "bob@gmail.com",
                timeZone: "Europe/Rome",
                language: "it",
              },
            };

            const response3 = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body2)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .expect(201);

            const responseBody2: CreateBookingOutput_2024_08_13 = response3.body;
            expect(responseBody2.status).toEqual(SUCCESS_STATUS);
            expect(responseBody2.data).toBeDefined();
            expect(responseDataIsBooking(responseBody2.data)).toBe(true);

            if (responseDataIsBooking(responseBody2.data)) {
              const data: BookingOutput_2024_08_13 = responseBody2.data;
              expect(data.id).toBeDefined();
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });

          it("should not allow booking more than maximumActiveBookings per attendee and offer rescheduling", async () => {
            const eventTypeIdWithMaxBookerBookings = await eventTypesRepositoryFixture.create(
              {
                slug: `max-bookings-count-per-booker-with-reschedule-${randomString(10)}`,
                length: 60,
                title: "Event Type with max bookings count per booker with reschedule",
                maxActiveBookingsPerBooker: 1,
                maxActiveBookingPerBookerOfferReschedule: true,
              },
              user.id
            );

            const body: CreateBookingInput_2024_08_13 = {
              start: new Date(Date.UTC(2040, 0, 13, 14, 0, 0)).toISOString(),
              eventTypeId: eventTypeIdWithMaxBookerBookings.id,
              attendee: {
                name: "charlie",
                email: "charlie@gmail.com",
                timeZone: "Europe/Rome",
                language: "it",
              },
            };

            const response = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .expect(201);

            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }

            const response2 = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .expect(400);

            expect(response2.body.error.message).toBe(
              `Attendee with this email can't book because the maximum number of active bookings has been reached. You can reschedule your existing booking (${responseBody.data.uid}) to a new timeslot instead.`
            );
          });
        });
      });
    });

    function responseDataIsRecurranceBooking(data: unknown): data is RecurringBookingOutput_2024_08_13 {
      return (
        !Array.isArray(data) &&
        typeof data === "object" &&
        data !== null &&
        data &&
        "id" in data &&
        "recurringBookingUid" in data
      );
    }

    describe("Meeting sessions", () => {
      it("should get cal video sessions for a booking", async () => {
        const mockSessions = [
          {
            id: "session-123",
            room: "daily-room-123",
            start_time: 1678901234,
            duration: 3600,
            ongoing: false,
            max_participants: 10,
            participants: [
              {
                user_id: "user-1",
                participant_id: "participant-1",
                user_name: "John Doe",
                join_time: 1678901234,
                duration: 3600,
              },
            ],
          },
        ];

        const booking = await bookingsRepositoryFixture.create({
          uid: `test-video-session-${randomString()}`,
          title: "Test Video Session Booking",
          description: "",
          startTime: new Date(Date.UTC(2030, 0, 8, 10, 0, 0)),
          endTime: new Date(Date.UTC(2030, 0, 8, 11, 0, 0)),
          eventType: {
            connect: {
              id: eventTypeId,
            },
          },
          user: {
            connect: {
              id: user.id,
            },
          },
          references: {
            create: [
              {
                type: "daily_video",
                uid: `daily-room-123-${randomString()}`,
                meetingId: "daily-room-123",
                meetingPassword: "test-password",
                meetingUrl: "https://daily.co/daily-room-123",
              },
            ],
          },
        });

        const calVideoService = app.get(CalVideoService);
        jest.spyOn(calVideoService, "getVideoSessions").mockResolvedValue([
          {
            id: mockSessions[0].id,
            room: mockSessions[0].room,
            startTime: mockSessions[0].start_time,
            duration: mockSessions[0].duration,
            ongoing: mockSessions[0].ongoing,
            maxParticipants: mockSessions[0].max_participants,
            participants: mockSessions[0].participants.map((p) => ({
              userId: p.user_id,
              userName: p.user_name,
              joinTime: p.join_time,
              duration: p.duration,
            })),
          },
        ]);

        const response = await request(app.getHttpServer())
          .get(`/v2/bookings/${booking.uid}/conferencing-sessions`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200);

        expect(response.body.status).toEqual(SUCCESS_STATUS);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].id).toEqual(mockSessions[0].id);
        expect(response.body.data[0].room).toEqual(mockSessions[0].room);
        expect(response.body.data[0].startTime).toEqual(mockSessions[0].start_time);
        expect(response.body.data[0].duration).toEqual(mockSessions[0].duration);
        expect(response.body.data[0].ongoing).toEqual(mockSessions[0].ongoing);
        expect(response.body.data[0].maxParticipants).toEqual(mockSessions[0].max_participants);
        expect(response.body.data[0].participants.length).toBe(1);
        expect(response.body.data[0].participants[0].userId).toEqual(mockSessions[0].participants[0].user_id);
        expect(response.body.data[0].participants[0].userName).toEqual(
          mockSessions[0].participants[0].user_name
        );

        await bookingsRepositoryFixture.deleteById(booking.id);
      });
    });

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(user.email);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await app.close();
    });
  });

  function responseDataIsBooking(data: unknown): data is BookingOutput_2024_08_13 {
    return !Array.isArray(data) && typeof data === "object" && data !== null && data && "id" in data;
  }

  function responseDataIsRecurringBooking(data: unknown): data is RecurringBookingOutput_2024_08_13[] {
    return Array.isArray(data);
  }
});
