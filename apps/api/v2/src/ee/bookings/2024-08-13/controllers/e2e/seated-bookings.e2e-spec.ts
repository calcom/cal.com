import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { RescheduleBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/reschedule-booking.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import { DateTime } from "luxon";
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import {
  CancelSeatedBookingInput_2024_08_13,
  CreateRecurringSeatedBookingOutput_2024_08_13,
  CreateSeatedBookingOutput_2024_08_13,
  GetBookingOutput_2024_08_13,
  GetBookingsOutput_2024_08_13,
  GetRecurringSeatedBookingOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
  RescheduleSeatedBookingInput_2024_08_13,
} from "@calcom/platform-types";
import {
  CreateBookingInput_2024_08_13,
  CreateRecurringBookingInput_2024_08_13,
} from "@calcom/platform-types";
import { PlatformOAuthClient, Team } from "@calcom/prisma/client";

describe("Bookings Endpoints 2024-08-13", () => {
  describe("Seated bookings", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let teamRepositoryFixture: TeamRepositoryFixture;

    const userEmail = "seated-bookings-controller-e2e@api.com";
    let user: User;

    const seatedTventTypeSlug = "peer-coding-seated";
    const recurringSeatedTventTypeSlug = "peer-coding-recurring-seated";
    let seatedEventTypeId: number;
    let recurringSeatedEventTypeId: number;
    const maxRecurrenceCount = 3;

    let createdSeatedBooking: CreateSeatedBookingOutput_2024_08_13;
    let createdRecurringSeatedBooking: CreateRecurringSeatedBookingOutput_2024_08_13[];

    const emailAttendeeOne = "mr_proper_seated@gmail.com";
    const nameAttendeeOne = "Mr Proper Seated";
    const emailAttendeeTwo = "mr_proper_friend_seated@gmail.com";
    const nameAttendeeTwo = "Mr Proper Friend Seated";

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

      organization = await teamRepositoryFixture.create({ name: "organization bookings" });
      oAuthClient = await createOAuthClient(organization.id);

      user = await userRepositoryFixture.create({
        email: userEmail,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: "working time",
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);
      const seatedEvent = await eventTypesRepositoryFixture.create(
        {
          title: "peer coding",
          slug: seatedTventTypeSlug,
          length: 60,
          seatsPerTimeSlot: 5,
          seatsShowAttendees: true,
          seatsShowAvailabilityCount: true,
          locations: [{ type: "inPerson", address: "via 10, rome, italy" }],
        },
        user.id
      );
      seatedEventTypeId = seatedEvent.id;

      const recurringSeatedEvent = await eventTypesRepositoryFixture.create(
        // note(Lauris): freq 2 means weekly, interval 1 means every week and count 3 means 3 weeks in a row
        {
          title: "peer coding recurring",
          slug: recurringSeatedTventTypeSlug,
          length: 60,
          recurringEvent: { freq: 2, count: maxRecurrenceCount, interval: 1 },
          seatsPerTimeSlot: 5,
          seatsShowAttendees: true,
          seatsShowAvailabilityCount: true,
          locations: [{ type: "inPerson", address: "via 10, rome, italy" }],
        },
        user.id
      );
      recurringSeatedEventTypeId = recurringSeatedEvent.id;

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

    it("should book an event type with seats for the first time", async () => {
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
        eventTypeId: seatedEventTypeId,
        attendee: {
          name: nameAttendeeOne,
          email: emailAttendeeOne,
          timeZone: "Europe/Rome",
          language: "it",
        },
        bookingFieldsResponses: {
          codingLanguage: "TypeScript",
        },
        metadata: {
          userId: "100",
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
          expect(responseDataIsCreateSeatedBooking(responseBody.data)).toBe(true);

          if (responseDataIsCreateSeatedBooking(responseBody.data)) {
            const data: CreateSeatedBookingOutput_2024_08_13 = responseBody.data;
            expect(data.seatUid).toBeDefined();
            const seatUid = data.seatUid;
            expect(data.id).toBeDefined();
            expect(data.uid).toBeDefined();
            expect(data.hosts[0].id).toEqual(user.id);
            expect(data.status).toEqual("accepted");
            expect(data.start).toEqual(body.start);
            expect(data.end).toEqual(
              DateTime.fromISO(body.start, { zone: "utc" }).plus({ hours: 1 }).toISO()
            );
            expect(data.duration).toEqual(60);
            expect(data.eventTypeId).toEqual(seatedEventTypeId);
            expect(data.eventType).toEqual({
              id: seatedEventTypeId,
              slug: seatedTventTypeSlug,
            });
            expect(data.attendees.length).toEqual(1);
            expect(data.attendees[0]).toEqual({
              name: body.attendee.name,
              email: body.attendee.email,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
              seatUid,
              bookingFieldsResponses: {
                name: body.attendee.name,
                ...body.bookingFieldsResponses,
              },
              metadata: body.metadata,
            });
            expect(data.location).toBeDefined();
            expect(data.absentHost).toEqual(false);
            createdSeatedBooking = data;
          } else {
            throw new Error(
              "Invalid response data - expected recurring booking but received non array response"
            );
          }
        });
    });

    it("should book an event type with seats for the second time", async () => {
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
        eventTypeId: seatedEventTypeId,
        attendee: {
          name: nameAttendeeTwo,
          email: emailAttendeeTwo,
          timeZone: "Europe/Rome",
          language: "it",
        },
        bookingFieldsResponses: {
          codingLanguage: "Rust",
        },
        metadata: {
          userId: "200",
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
          expect(responseDataIsCreateSeatedBooking(responseBody.data)).toBe(true);

          if (responseDataIsCreateSeatedBooking(responseBody.data)) {
            const data: CreateSeatedBookingOutput_2024_08_13 = responseBody.data;
            expect(data.seatUid).toBeDefined();
            const seatUid = data.seatUid;
            expect(data.id).toBeDefined();
            expect(data.uid).toBeDefined();
            expect(data.hosts[0].id).toEqual(user.id);
            expect(data.status).toEqual("accepted");
            expect(data.start).toEqual(body.start);
            expect(data.end).toEqual(
              DateTime.fromISO(body.start, { zone: "utc" }).plus({ hours: 1 }).toISO()
            );
            expect(data.duration).toEqual(60);
            expect(data.eventTypeId).toEqual(seatedEventTypeId);
            expect(data.eventType).toEqual({
              id: seatedEventTypeId,
              slug: seatedTventTypeSlug,
            });
            expect(data.attendees.length).toEqual(2);
            // note(Lauris): first attendee is from previous test request
            const firstAttendee = data.attendees.find((attendee) => attendee.name === nameAttendeeOne);
            expect(firstAttendee).toEqual({
              name: createdSeatedBooking.attendees[0].name,
              email: createdSeatedBooking.attendees[0].email,
              timeZone: createdSeatedBooking.attendees[0].timeZone,
              language: createdSeatedBooking.attendees[0].language,
              absent: false,
              seatUid: createdSeatedBooking.seatUid,
              bookingFieldsResponses: {
                name: createdSeatedBooking.attendees[0].name,
                ...createdSeatedBooking.attendees[0].bookingFieldsResponses,
              },
              metadata: createdSeatedBooking.attendees[0].metadata,
            });
            const secondAttendee = data.attendees.find((attendee) => attendee.name === nameAttendeeTwo);
            expect(secondAttendee).toEqual({
              name: body.attendee.name,
              email: body.attendee.email,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
              seatUid,
              bookingFieldsResponses: {
                name: body.attendee.name,
                ...body.bookingFieldsResponses,
              },
              metadata: body.metadata,
            });
            expect(data.location).toBeDefined();
            expect(data.absentHost).toEqual(false);
            createdSeatedBooking = data;
          } else {
            throw new Error(
              "Invalid response data - expected recurring booking but received non array response"
            );
          }
        });
    });

    it("should book a recurring event type with seats", async () => {
      const recurrenceCount = 2;
      const body: CreateRecurringBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 11, 0, 0)).toISOString(),
        eventTypeId: recurringSeatedEventTypeId,
        attendee: {
          name: "Mr Proper",
          email: "mr_proper@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
        location: "https://meet.google.com/abc-def-ghi",
        bookingFieldsResponses: {
          codingLanguage: "TypeScript",
        },
        recurrenceCount,
        metadata: {
          userId: "300",
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
          expect(responseDataIsCreateRecurringSeatedBooking(responseBody.data)).toBe(true);

          if (responseDataIsCreateRecurringSeatedBooking(responseBody.data)) {
            const data: CreateRecurringSeatedBookingOutput_2024_08_13[] = responseBody.data;
            expect(data.length).toEqual(recurrenceCount);

            const firstBooking = data[0];
            expect(firstBooking.seatUid).toBeDefined();
            const seatUid = firstBooking.seatUid;
            expect(firstBooking.id).toBeDefined();
            expect(firstBooking.uid).toBeDefined();
            expect(firstBooking.hosts[0].id).toEqual(user.id);
            expect(firstBooking.status).toEqual("accepted");
            expect(firstBooking.start).toEqual(body.start);
            expect(firstBooking.end).toEqual(
              DateTime.fromISO(body.start, { zone: "utc" }).plus({ hours: 1 }).toISO()
            );
            expect(firstBooking.duration).toEqual(60);
            expect(firstBooking.eventTypeId).toEqual(recurringSeatedEventTypeId);
            expect(firstBooking.eventType).toEqual({
              id: recurringSeatedEventTypeId,
              slug: recurringSeatedTventTypeSlug,
            });
            expect(firstBooking.attendees.length).toEqual(1);
            expect(firstBooking.attendees[0]).toEqual({
              name: body.attendee.name,
              email: body.attendee.email,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
              seatUid,
              bookingFieldsResponses: {
                name: body.attendee.name,
                ...body.bookingFieldsResponses,
              },
              metadata: body.metadata,
            });
            expect(firstBooking.location).toEqual(body.location);
            expect(firstBooking.absentHost).toEqual(false);

            const secondBooking = data[1];
            expect(secondBooking.seatUid).toBeDefined();
            const secondSeatUid = secondBooking.seatUid;
            expect(secondBooking.id).toBeDefined();
            expect(secondBooking.uid).toBeDefined();
            expect(secondBooking.hosts[0].id).toEqual(user.id);
            expect(secondBooking.status).toEqual("accepted");
            const expectedStart = DateTime.fromISO(body.start, { zone: "utc" }).plus({ weeks: 1 }).toISO();
            expect(secondBooking.start).toEqual(expectedStart);
            expect(secondBooking.end).toEqual(
              DateTime.fromISO(expectedStart!, { zone: "utc" }).plus({ hours: 1 }).toISO()
            );
            expect(secondBooking.duration).toEqual(60);
            expect(secondBooking.eventTypeId).toEqual(recurringSeatedEventTypeId);
            expect(secondBooking.eventType).toEqual({
              id: recurringSeatedEventTypeId,
              slug: recurringSeatedTventTypeSlug,
            });
            expect(secondBooking.attendees.length).toEqual(1);
            expect(secondBooking.attendees[0]).toEqual({
              name: body.attendee.name,
              email: body.attendee.email,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
              seatUid: secondSeatUid,
              bookingFieldsResponses: {
                name: body.attendee.name,
                ...body.bookingFieldsResponses,
              },
              metadata: body.metadata,
            });
            expect(secondBooking.location).toEqual(body.location);
            expect(secondBooking.absentHost).toEqual(false);
            createdRecurringSeatedBooking = data;
          } else {
            throw new Error(
              "Invalid response data - expected recurring booking but received non array response"
            );
          }
        });
    });

    it("should get a booking for an event type with seats", async () => {
      return request(app.getHttpServer())
        .get(`/v2/bookings/${createdSeatedBooking.uid}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsGetSeatedBooking(responseBody.data)).toBe(true);

          if (responseDataIsGetSeatedBooking(responseBody.data)) {
            const data: GetSeatedBookingOutput_2024_08_13 = responseBody.data;
            const expected = structuredClone(createdSeatedBooking);
            // note(Lauris): seatUid in get response resides only in each attendee object
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            delete expected.seatUid;
            expect(data).toEqual(expected);
          } else {
            throw new Error(
              "Invalid response data - expected recurring booking but received non array response"
            );
          }
        });
    });

    it("should get a booking for a recurring event type with seats", async () => {
      return request(app.getHttpServer())
        .get(`/v2/bookings/${createdRecurringSeatedBooking[1].recurringBookingUid}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsGetRecurringSeatedBooking(responseBody.data)).toBe(true);

          if (responseDataIsGetRecurringSeatedBooking(responseBody.data)) {
            const data: GetRecurringSeatedBookingOutput_2024_08_13[] = responseBody.data;
            const expected = structuredClone(createdRecurringSeatedBooking);
            for (const booking of expected) {
              // note(Lauris): seatUid in get response resides only in each attendee object
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              delete booking.seatUid;
            }
            expect(data).toEqual(expected);
          } else {
            throw new Error(
              "Invalid response data - expected recurring booking but received non array response"
            );
          }
        });
    });

    it("should get a specific recurrence of a booking for a recurring event type with seats", async () => {
      return request(app.getHttpServer())
        .get(`/v2/bookings/${createdRecurringSeatedBooking[0].uid}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsGetSeatedBooking(responseBody.data)).toBe(true);

          if (responseDataIsGetSeatedBooking(responseBody.data)) {
            const data: GetSeatedBookingOutput_2024_08_13 = responseBody.data;
            const expected = structuredClone(createdRecurringSeatedBooking[0]);
            // note(Lauris): seatUid in get response resides only in each attendee object
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            delete expected.seatUid;
            expect(data).toEqual(expected);
          } else {
            throw new Error(
              "Invalid response data - expected recurring booking but received non array response"
            );
          }
        });
    });

    it("should get all seated bookings", async () => {
      return request(app.getHttpServer())
        .get("/v2/bookings?sortCreated=asc")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingsOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseBody.data.length).toEqual(3);

          const seatedBooking = responseBody.data[0];
          const seatedBookingExpected = structuredClone(createdSeatedBooking);
          // note(Lauris): seatUid in get response resides only in each attendee object
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          delete seatedBookingExpected.seatUid;
          expect(seatedBooking).toEqual(seatedBookingExpected);

          const recurringSeatedBookings = [responseBody.data[1], responseBody.data[2]];
          const recurringSeatedBookingsExpected = structuredClone(createdRecurringSeatedBooking);
          for (const booking of recurringSeatedBookingsExpected) {
            // note(Lauris): seatUid in get response resides only in each attendee object
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            delete booking.seatUid;
          }
          expect(recurringSeatedBookings).toEqual(recurringSeatedBookingsExpected);
        });
    });

    it("should reschedule seated booking", async () => {
      const body: RescheduleSeatedBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 15, 0, 0)).toISOString(),
        seatUid: createdSeatedBooking.seatUid,
      };

      return request(app.getHttpServer())
        .post(`/v2/bookings/${createdSeatedBooking.uid}/reschedule`)
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201)
        .then(async (response) => {
          const responseBody: RescheduleBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsGetSeatedBooking(responseBody.data)).toBe(true);

          if (responseDataIsGetSeatedBooking(responseBody.data)) {
            const data: CreateSeatedBookingOutput_2024_08_13 = responseBody.data;
            expect(data.seatUid).toBeDefined();
            const seatUid = data.seatUid;
            expect(data.id).toBeDefined();
            expect(data.uid).toBeDefined();
            expect(data.hosts[0].id).toEqual(user.id);
            expect(data.status).toEqual("accepted");
            expect(data.start).toEqual(body.start);
            expect(data.end).toEqual(
              DateTime.fromISO(body.start, { zone: "utc" }).plus({ hours: 1 }).toISO()
            );
            expect(data.duration).toEqual(60);
            expect(data.eventTypeId).toEqual(seatedEventTypeId);
            expect(data.eventType).toEqual({
              id: seatedEventTypeId,
              slug: seatedTventTypeSlug,
            });
            expect(data.attendees.length).toEqual(1);
            const attendee = createdSeatedBooking.attendees.find((a) => a.seatUid === body.seatUid);
            expect(data.attendees[0]).toEqual({
              name: attendee?.name,
              email: attendee?.email,
              timeZone: attendee?.timeZone,
              language: attendee?.language,
              absent: false,
              seatUid,
              bookingFieldsResponses: {
                name: attendee?.name,
                ...attendee?.bookingFieldsResponses,
              },
              metadata: attendee?.metadata,
            });
            expect(data.location).toBeDefined();
            expect(data.absentHost).toEqual(false);
            createdSeatedBooking = data;
          } else {
            throw new Error("Invalid response data - expected booking but received array response");
          }
        });
    });

    it("should cancel seated booking", async () => {
      const body: CancelSeatedBookingInput_2024_08_13 = {
        seatUid: createdSeatedBooking.seatUid,
      };

      return request(app.getHttpServer())
        .post(`/v2/bookings/${createdSeatedBooking.uid}/cancel`)
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: RescheduleBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsGetSeatedBooking(responseBody.data)).toBe(true);

          if (responseDataIsGetSeatedBooking(responseBody.data)) {
            const data: GetSeatedBookingOutput_2024_08_13 = responseBody.data;
            expect(data.id).toBeDefined();
            expect(data.uid).toBeDefined();
            expect(data.hosts[0].id).toEqual(user.id);
            expect(data.status).toEqual("cancelled");
            expect(data.start).toEqual(createdSeatedBooking.start);
            expect(data.end).toEqual(createdSeatedBooking.end);
            expect(data.duration).toEqual(60);
            expect(data.eventTypeId).toEqual(seatedEventTypeId);
            expect(data.eventType).toEqual({
              id: seatedEventTypeId,
              slug: seatedTventTypeSlug,
            });
            expect(data.attendees.length).toEqual(0);
            expect(data.location).toBeDefined();
            expect(data.absentHost).toEqual(false);
          } else {
            throw new Error("Invalid response data - expected booking but received array response");
          }
        });
    });

    function responseDataIsCreateSeatedBooking(data: any): data is CreateSeatedBookingOutput_2024_08_13 {
      return data.hasOwnProperty("seatUid");
    }

    function responseDataIsCreateRecurringSeatedBooking(
      data: any
    ): data is CreateRecurringSeatedBookingOutput_2024_08_13[] {
      return Array.isArray(data);
    }

    function responseDataIsGetSeatedBooking(data: any): data is GetSeatedBookingOutput_2024_08_13 {
      return data?.attendees?.every((attendee: any) => attendee?.hasOwnProperty("seatUid"));
    }

    function responseDataIsGetRecurringSeatedBooking(
      data: any
    ): data is GetRecurringSeatedBookingOutput_2024_08_13[] {
      return Array.isArray(data);
    }

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(user.email);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await app.close();
    });
  });

  describe("Recurring seated bookings creation", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let teamRepositoryFixture: TeamRepositoryFixture;

    const userEmail = "seated-bookings-controller-e2e@api.com";
    let user: User;

    const seatedTventTypeSlug = "peer-coding-seated";
    const recurringSeatedTventTypeSlug = "peer-coding-recurring-seated";
    let seatedEventTypeId: number;
    let recurringSeatedEventTypeId: number;
    const maxRecurrenceCount = 3;

    let createdSeatedBooking: CreateSeatedBookingOutput_2024_08_13;
    let createdRecurringSeatedBooking: CreateRecurringSeatedBookingOutput_2024_08_13[];

    const emailAttendeeOne = "mr_proper_first@gmail.com";
    const nameAttendeeOne = "Mr Proper First";
    const emailAttendeeTwo = "mr_proper_second@gmail.com";
    const nameAttendeeTwo = "Mr Proper Second";

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

      organization = await teamRepositoryFixture.create({ name: "organization bookings" });
      oAuthClient = await createOAuthClient(organization.id);

      user = await userRepositoryFixture.create({
        email: userEmail,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: "working time",
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);
      const seatedEvent = await eventTypesRepositoryFixture.create(
        {
          title: "peer coding",
          slug: seatedTventTypeSlug,
          length: 60,
          seatsPerTimeSlot: 5,
          seatsShowAttendees: true,
          seatsShowAvailabilityCount: true,
          locations: [{ type: "inPerson", address: "via 10, rome, italy" }],
        },
        user.id
      );
      seatedEventTypeId = seatedEvent.id;

      const recurringSeatedEvent = await eventTypesRepositoryFixture.create(
        // note(Lauris): freq 2 means weekly, interval 1 means every week and count 3 means 3 weeks in a row
        {
          title: "peer coding recurring",
          slug: recurringSeatedTventTypeSlug,
          length: 60,
          recurringEvent: { freq: 2, count: maxRecurrenceCount, interval: 1 },
          seatsPerTimeSlot: 5,
          seatsShowAttendees: true,
          seatsShowAvailabilityCount: true,
          locations: [{ type: "inPerson", address: "via 10, rome, italy" }],
        },
        user.id
      );
      recurringSeatedEventTypeId = recurringSeatedEvent.id;

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

    it("should book a recurring event type with seats for the first time", async () => {
      const recurrenceCount = 2;
      const body: CreateRecurringBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 11, 0, 0)).toISOString(),
        eventTypeId: recurringSeatedEventTypeId,
        attendee: {
          name: nameAttendeeOne,
          email: emailAttendeeOne,
          timeZone: "Europe/Rome",
          language: "it",
        },
        location: "https://meet.google.com/abc-def-ghi",
        bookingFieldsResponses: {
          codingLanguage: "TypeScript",
        },
        metadata: {
          userId: "1000",
        },
        recurrenceCount,
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
          expect(responseDataIsCreateRecurringSeatedBooking(responseBody.data)).toBe(true);

          if (responseDataIsCreateRecurringSeatedBooking(responseBody.data)) {
            const data: CreateRecurringSeatedBookingOutput_2024_08_13[] = responseBody.data;
            expect(data.length).toEqual(recurrenceCount);

            const firstBooking = data[0];
            expect(firstBooking.seatUid).toBeDefined();
            const seatUid = firstBooking.seatUid;
            expect(firstBooking.id).toBeDefined();
            expect(firstBooking.uid).toBeDefined();
            expect(firstBooking.hosts[0].id).toEqual(user.id);
            expect(firstBooking.status).toEqual("accepted");
            expect(firstBooking.start).toEqual(body.start);
            expect(firstBooking.end).toEqual(
              DateTime.fromISO(body.start, { zone: "utc" }).plus({ hours: 1 }).toISO()
            );
            expect(firstBooking.duration).toEqual(60);
            expect(firstBooking.eventTypeId).toEqual(recurringSeatedEventTypeId);
            expect(firstBooking.eventType).toEqual({
              id: recurringSeatedEventTypeId,
              slug: recurringSeatedTventTypeSlug,
            });
            expect(firstBooking.attendees.length).toEqual(1);
            expect(firstBooking.attendees[0]).toEqual({
              name: body.attendee.name,
              email: body.attendee.email,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
              seatUid,
              bookingFieldsResponses: {
                name: body.attendee.name,
                ...body.bookingFieldsResponses,
              },
              metadata: body.metadata,
            });
            expect(firstBooking.location).toEqual(body.location);
            expect(firstBooking.absentHost).toEqual(false);

            const secondBooking = data[1];
            expect(secondBooking.seatUid).toBeDefined();
            const secondSeatUid = secondBooking.seatUid;
            expect(secondBooking.id).toBeDefined();
            expect(secondBooking.uid).toBeDefined();
            expect(secondBooking.hosts[0].id).toEqual(user.id);
            expect(secondBooking.status).toEqual("accepted");
            const expectedStart = DateTime.fromISO(body.start, { zone: "utc" }).plus({ weeks: 1 }).toISO();
            expect(secondBooking.start).toEqual(expectedStart);
            expect(secondBooking.end).toEqual(
              DateTime.fromISO(expectedStart!, { zone: "utc" }).plus({ hours: 1 }).toISO()
            );
            expect(secondBooking.duration).toEqual(60);
            expect(secondBooking.eventTypeId).toEqual(recurringSeatedEventTypeId);
            expect(secondBooking.eventType).toEqual({
              id: recurringSeatedEventTypeId,
              slug: recurringSeatedTventTypeSlug,
            });
            expect(secondBooking.attendees.length).toEqual(1);
            expect(secondBooking.attendees[0]).toEqual({
              name: body.attendee.name,
              email: body.attendee.email,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
              seatUid: secondSeatUid,
              bookingFieldsResponses: {
                name: body.attendee.name,
                ...body.bookingFieldsResponses,
              },
              metadata: body.metadata,
            });
            expect(secondBooking.location).toEqual(body.location);
            expect(secondBooking.absentHost).toEqual(false);
            createdRecurringSeatedBooking = data;
          } else {
            throw new Error(
              "Invalid response data - expected recurring booking but received non array response"
            );
          }
        });
    });

    it("should book a recurring event type with seats for the second time", async () => {
      const recurrenceCount = 2;
      const body: CreateRecurringBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 11, 0, 0)).toISOString(),
        eventTypeId: recurringSeatedEventTypeId,
        attendee: {
          name: nameAttendeeTwo,
          email: emailAttendeeTwo,
          timeZone: "Europe/Rome",
          language: "it",
        },
        location: "https://meet.google.com/abc-def-ghi",
        bookingFieldsResponses: {
          codingLanguage: "TypeScript",
        },
        metadata: {
          userId: "2000",
        },
        recurrenceCount,
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
          expect(responseDataIsCreateRecurringSeatedBooking(responseBody.data)).toBe(true);

          if (responseDataIsCreateRecurringSeatedBooking(responseBody.data)) {
            const data: CreateRecurringSeatedBookingOutput_2024_08_13[] = responseBody.data;
            expect(data.length).toEqual(recurrenceCount);

            const firstBooking = data[0];
            expect(firstBooking.seatUid).toBeDefined();
            const seatUid = firstBooking.seatUid;
            expect(firstBooking.id).toBeDefined();
            expect(firstBooking.uid).toBeDefined();
            expect(firstBooking.hosts[0].id).toEqual(user.id);
            expect(firstBooking.status).toEqual("accepted");
            expect(firstBooking.start).toEqual(body.start);
            expect(firstBooking.end).toEqual(
              DateTime.fromISO(body.start, { zone: "utc" }).plus({ hours: 1 }).toISO()
            );
            expect(firstBooking.duration).toEqual(60);
            expect(firstBooking.eventTypeId).toEqual(recurringSeatedEventTypeId);
            expect(firstBooking.eventType).toEqual({
              id: recurringSeatedEventTypeId,
              slug: recurringSeatedTventTypeSlug,
            });
            expect(firstBooking.attendees.length).toEqual(2);
            expect(firstBooking.attendees[0]).toEqual({
              name: nameAttendeeOne,
              email: emailAttendeeOne,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
              seatUid: createdRecurringSeatedBooking[0].seatUid,
              bookingFieldsResponses: {
                name: nameAttendeeOne,
                ...body.bookingFieldsResponses,
              },
              metadata: createdRecurringSeatedBooking[0].attendees[0].metadata,
            });
            expect(firstBooking.attendees[1]).toEqual({
              name: nameAttendeeTwo,
              email: emailAttendeeTwo,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
              seatUid,
              bookingFieldsResponses: {
                name: nameAttendeeTwo,
                ...body.bookingFieldsResponses,
              },
              metadata: body.metadata,
            });
            expect(firstBooking.location).toEqual(body.location);
            expect(firstBooking.absentHost).toEqual(false);

            const secondBooking = data[1];
            expect(secondBooking.seatUid).toBeDefined();
            const secondSeatUid = secondBooking.seatUid;
            expect(secondBooking.id).toBeDefined();
            expect(secondBooking.uid).toBeDefined();
            expect(secondBooking.hosts[0].id).toEqual(user.id);
            expect(secondBooking.status).toEqual("accepted");
            const expectedStart = DateTime.fromISO(body.start, { zone: "utc" }).plus({ weeks: 1 }).toISO();
            expect(secondBooking.start).toEqual(expectedStart);
            expect(secondBooking.end).toEqual(
              DateTime.fromISO(expectedStart!, { zone: "utc" }).plus({ hours: 1 }).toISO()
            );
            expect(secondBooking.duration).toEqual(60);
            expect(secondBooking.eventTypeId).toEqual(recurringSeatedEventTypeId);
            expect(secondBooking.eventType).toEqual({
              id: recurringSeatedEventTypeId,
              slug: recurringSeatedTventTypeSlug,
            });
            expect(secondBooking.attendees.length).toEqual(2);
            expect(secondBooking.attendees[0]).toEqual({
              name: nameAttendeeOne,
              email: emailAttendeeOne,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
              seatUid: createdRecurringSeatedBooking[1].seatUid,
              bookingFieldsResponses: {
                name: nameAttendeeOne,
                ...body.bookingFieldsResponses,
              },
              metadata: createdRecurringSeatedBooking[0].attendees[0].metadata,
            });
            expect(secondBooking.attendees[1]).toEqual({
              name: nameAttendeeTwo,
              email: emailAttendeeTwo,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
              seatUid: secondSeatUid,
              bookingFieldsResponses: {
                name: nameAttendeeTwo,
                ...body.bookingFieldsResponses,
              },
              metadata: body.metadata,
            });
            expect(secondBooking.location).toEqual(body.location);
            expect(secondBooking.absentHost).toEqual(false);
            createdRecurringSeatedBooking = data;
          } else {
            throw new Error(
              "Invalid response data - expected recurring booking but received non array response"
            );
          }
        });
    });

    function responseDataIsCreateRecurringSeatedBooking(
      data: any
    ): data is CreateRecurringSeatedBookingOutput_2024_08_13[] {
      return Array.isArray(data);
    }

    function responseDataIsGetSeatedBooking(data: any): data is GetSeatedBookingOutput_2024_08_13 {
      return data?.attendees?.every((attendee: any) => attendee?.hasOwnProperty("seatUid"));
    }

    function responseDataIsGetRecurringSeatedBooking(
      data: any
    ): data is GetRecurringSeatedBookingOutput_2024_08_13[] {
      return Array.isArray(data);
    }

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(user.email);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await app.close();
    });
  });
});
