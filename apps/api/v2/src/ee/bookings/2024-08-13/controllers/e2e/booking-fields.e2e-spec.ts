import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomNumber } from "test/utils/randomNumber";
import { withApiAuth } from "test/utils/withApiAuth";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import {
  CreateBookingInput_2024_08_13,
  GetBookingOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
} from "@calcom/platform-types";
import { BookingOutput_2024_08_13 } from "@calcom/platform-types";
import { Booking, PlatformOAuthClient, Team, User } from "@calcom/prisma/client";

const suffix = randomNumber();

describe("Bookings Endpoints 2024-08-13", () => {
  describe("Booking fields", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let teamRepositoryFixture: TeamRepositoryFixture;

    const userEmail = `alice-${suffix}@api.com`;
    let user: User;

    let bookingWithSplitName: Booking;
    const splitName = {
      firstName: "Oldie",
      lastName: "Goldie",
    };

    let seatedBookingWithSplitName: Booking;

    let eventTypeWithBookingFieldsId: number;

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

      organization = await teamRepositoryFixture.create({ name: `booking fields ${suffix}` });
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
      const event = await eventTypesRepositoryFixture.create(
        { title: "peer coding", slug: `normal-booking-${randomNumber()}`, length: 60 },
        user.id
      );

      bookingWithSplitName = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: user.id,
          },
        },
        startTime: new Date(Date.UTC(2020, 0, 8, 12, 0, 0)),
        endTime: new Date(Date.UTC(2020, 0, 8, 13, 0, 0)),
        title: "peer coding lets goo",
        uid: "booking",
        eventType: {
          connect: {
            id: event.id,
          },
        },
        location: "integrations:daily",
        customInputs: {},
        metadata: {},
        responses: {
          name: splitName,
          email: "oldie@gmail.com",
        },
        attendees: {
          create: {
            email: "oldie@gmail.com",
            name: "Oldie Goldie",
            locale: "lv",
            timeZone: "Europe/Rome",
          },
        },
      });

      const seatedEvent = await eventTypesRepositoryFixture.create(
        { title: "peer coding", slug: `seated-${randomNumber()}`, length: 60, seatsPerTimeSlot: 3 },
        user.id
      );

      seatedBookingWithSplitName = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: user.id,
          },
        },
        startTime: new Date(Date.UTC(2020, 0, 8, 14, 0, 0)),
        endTime: new Date(Date.UTC(2020, 0, 8, 15, 0, 0)),
        title: "peer coding lets goo",
        uid: "seated-booking",
        eventType: {
          connect: {
            id: seatedEvent.id,
          },
        },
        location: "integrations:daily",
        customInputs: {},
        metadata: {},
        responses: {
          name: splitName,
          email: "oldie@gmail.com",
        },
        attendees: {
          create: {
            email: "oldie@gmail.com",
            name: "Oldie Goldie",
            locale: "lv",
            timeZone: "Europe/Rome",
            bookingSeat: {
              create: {
                referenceUid: "unique-seat-uid",
                data: {
                  responses: {
                    email: "oldie@gmail.com",
                    name: {
                      firstName: "Oldie",
                      lastName: "Goldie",
                    },
                  },
                },
                metadata: {},
                booking: {
                  connect: {
                    uid: "seated-booking",
                  },
                },
              },
            },
          },
        },
      });

      const eventTypeWithBookingFields = await eventTypesRepositoryFixture.create(
        {
          title: "peer coding with booking fields",
          slug: `with-custom-booking-fields-${randomNumber()}`,
          length: 60,
          bookingFields: [
            {
              name: "name",
              type: "name",
              label: "",
              sources: [
                {
                  id: "default",
                  type: "default",
                  label: "Default",
                },
              ],
              variant: "fullName",
              editable: "system",
              required: true,
              placeholder: "",
              defaultLabel: "your_name",
              variantsConfig: {
                variants: {
                  fullName: {
                    fields: [
                      {
                        name: "fullName",
                        type: "text",
                        label: "your_name",
                        required: true,
                        placeholder: "",
                      },
                    ],
                  },
                  firstAndLastName: {
                    fields: [
                      {
                        name: "firstName",
                        type: "text",
                        label: "name",
                        required: true,
                        placeholder: "lauris",
                      },
                      {
                        name: "lastName",
                        type: "text",
                        label: "surname",
                        required: true,
                        placeholder: "skraucis",
                      },
                    ],
                  },
                },
              },
              disableOnPrefill: false,
            },
            {
              name: "email",
              type: "email",
              sources: [
                {
                  id: "default",
                  type: "default",
                  label: "Default",
                },
              ],
              editable: "system",
              required: true,
              defaultLabel: "email_address",
            },
            {
              name: "location",
              type: "radioInput",
              sources: [
                {
                  id: "default",
                  type: "default",
                  label: "Default",
                },
              ],
              editable: "system",
              required: false,
              defaultLabel: "location",
              getOptionsAt: "locations",
              optionsInputs: {
                phone: {
                  type: "phone",
                  required: true,
                  placeholder: "",
                },
                somewhereElse: {
                  type: "text",
                  required: true,
                  placeholder: "",
                },
                attendeeInPerson: {
                  type: "address",
                  required: true,
                  placeholder: "",
                },
              },
              hideWhenJustOneOption: true,
            },
            {
              name: "title",
              type: "text",
              hidden: true,
              sources: [
                {
                  id: "default",
                  type: "default",
                  label: "Default",
                },
              ],
              editable: "system-but-optional",
              required: true,
              defaultLabel: "what_is_this_meeting_about",
              defaultPlaceholder: "",
            },
            {
              name: "notes",
              type: "textarea",
              sources: [
                {
                  id: "default",
                  type: "default",
                  label: "Default",
                },
              ],
              editable: "system-but-optional",
              required: false,
              defaultLabel: "additional_notes",
              defaultPlaceholder: "share_additional_notes",
            },
            {
              name: "guests",
              type: "multiemail",
              hidden: false,
              sources: [
                {
                  id: "default",
                  type: "default",
                  label: "Default",
                },
              ],
              editable: "system-but-optional",
              required: false,
              defaultLabel: "additional_guests",
              defaultPlaceholder: "email",
            },
            {
              name: "rescheduleReason",
              type: "textarea",
              views: [
                {
                  id: "reschedule",
                  label: "Reschedule View",
                },
              ],
              sources: [
                {
                  id: "default",
                  type: "default",
                  label: "Default",
                },
              ],
              editable: "system-but-optional",
              required: false,
              defaultLabel: "reason_for_reschedule",
              defaultPlaceholder: "reschedule_placeholder",
            },
            {
              name: "favorite-movie",
              type: "text",
              label: "favorite movie",
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
              placeholder: "matrix",
              disableOnPrefill: false,
            },
          ],
        },
        user.id
      );
      eventTypeWithBookingFieldsId = eventTypeWithBookingFields.id;

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

    describe("get individual booking", () => {
      it("should should get a seated booking with split name responses", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings/${bookingWithSplitName.uid}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.attendees[0].name).toEqual(`${splitName.firstName} ${splitName.lastName}`);
              expect(data.bookingFieldsResponses.name).toEqual(splitName);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibily recurring bookings"
              );
            }
          });
      });

      it("should should get a seated booking with split name responses", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings/${seatedBookingWithSplitName.uid}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              // eslint-disable-next-line
              // @ts-ignore
              const data: GetSeatedBookingOutput_2024_08_13 = responseBody.data;
              console.log("asap data", JSON.stringify(data, null, 2));
              expect(data.attendees[0].name).toEqual(`${splitName.firstName} ${splitName.lastName}`);
              expect(data.attendees[0].bookingFieldsResponses.name).toEqual(splitName);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibily recurring bookings"
              );
            }
          });
      });
    });

    describe("make booking", () => {
      it("should not be able to book an event type with custom required booking fields if they are missing in bookingFieldsResponses", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
          eventTypeId: eventTypeWithBookingFieldsId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: "https://meet.google.com/abc-def-ghi",
        };
        return request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });

      it("should be able to book an event type with custom required booking fields", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
          eventTypeId: eventTypeWithBookingFieldsId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: "https://meet.google.com/abc-def-ghi",
          bookingFieldsResponses: {
            "favorite-movie": "lord of the rings",
          },
        };
        return request(app.getHttpServer())
          .post(`/v2/bookings`)
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
              expect(data.bookingFieldsResponses["favorite-movie"]).toEqual("lord of the rings");
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibily recurring bookings"
              );
            }
          });
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

  function responseDataIsBooking(data: any): data is BookingOutput_2024_08_13 {
    return !Array.isArray(data) && typeof data === "object" && data && "id" in data;
  }
});
