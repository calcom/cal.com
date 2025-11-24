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
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import { CreateBookingInput_2024_08_13, GetBookingOutput_2024_08_13, GetSeatedBookingOutput_2024_08_13 } from "@calcom/platform-types";
import { BookingOutput_2024_08_13 } from "@calcom/platform-types";
import type { Booking, PlatformOAuthClient, Team, User, EventType } from "@calcom/prisma/client";

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

    const userEmail = `booking-fields-2024-08-13-user-${randomString()}@api.com`;
    let user: User;

    let bookingWithSplitName: Booking;
    const splitName = {
      firstName: "Oldie",
      lastName: "Goldie",
    };

    let seatedBookingWithSplitName: Booking;

    let eventTypeId: number;
    let seatedEvent: EventType;
    let eventTypeWithBookingFields: EventType;
    let eventTypeWithBookingFielsCustom: EventType;
    const eventTypeSlug = `booking-fields-2024-08-13-event-type-${randomString()}`;
    const eventTypeWithBookingFieldsSlug = `booking-fields-2024-08-13-event-type-${randomString()}`;
    const seatedEventTypeSlug = `booking-fields-2024-08-13-event-type-${randomString()}`;

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

      organization = await teamRepositoryFixture.create({
        name: `booking-fields-2024-08-13-organization-${randomString()}`,
      });
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
        name: `booking-fields-2024-08-13-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);
      const event = await eventTypesRepositoryFixture.create(
        {
          title: `booking-fields-2024-08-13-event-type-${randomString()}`,
          slug: eventTypeSlug,
          length: 60,
        },
        user.id
      );

      eventTypeId = event.id;

      seatedEvent = await eventTypesRepositoryFixture.create(
        {
          title: `booking-fields-2024-08-13-event-type-${randomString()}`,
          slug: seatedEventTypeSlug,
          length: 60,
          seatsPerTimeSlot: 3,
          seatsShowAttendees: true,
        },
        user.id
      );

      eventTypeWithBookingFields = await eventTypesRepositoryFixture.create(
        {
          title: `booking-fields-2024-08-13-event-type-${randomString()}`,
          slug: eventTypeWithBookingFieldsSlug,
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
            {
              name: "video-url",
              type: "url",
              label: "video url",
              sources: [
                {
                  id: "user",
                  type: "user",
                  label: "User",
                  fieldRequired: true,
                },
              ],
              editable: "user",
              required: false,
              placeholder: "add video url",
              disableOnPrefill: false,
            },
          ],
        },
        user.id
      );

      eventTypeWithBookingFielsCustom = await eventTypesRepositoryFixture.create(
        {
          title: "test booking field types",
          slug: "test-booking-field-types",
          length: 30,
          bookingFields: [
            {
              name: "name",
              type: "name",
              sources: [{ id: "default", type: "default", label: "Default" }],
              variant: "fullName",
              editable: "system",
              required: true,
              defaultLabel: "your_name",
              variantsConfig: {
                variants: {
                  fullName: {
                    fields: [
                      {
                        name: "fullName",
                        type: "text",
                        required: true,
                      },
                    ],
                  },
                  firstAndLastName: {
                    fields: [
                      {
                        name: "firstName",
                        type: "text",
                        label: "",
                        required: true,
                        placeholder: "",
                      },
                      {
                        name: "lastName",
                        type: "text",
                        label: "",
                        required: false,
                        placeholder: "",
                      },
                    ],
                  },
                },
              },
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
              defaultLabel: "location",
              getOptionsAt: "locations",
              optionsInputs: {
                phone: { type: "phone", required: true, placeholder: "" },
                somewhereElse: { type: "text", required: true, placeholder: "" },
                attendeeInPerson: { type: "address", required: true, placeholder: "" },
              },
              hideWhenJustOneOption: true,
            },
            {
              name: "test-phone",
              type: "phone",
              label: "test-phone",
              hidden: false,
              sources: [{ id: "user", type: "user", label: "User", fieldRequired: true }],
              editable: "user",
              required: false,
              disableOnPrefill: false,
            },
            {
              name: "test-address",
              type: "address",
              label: "test-address",
              hidden: false,
              sources: [{ id: "user", type: "user", label: "User", fieldRequired: true }],
              editable: "user",
              required: false,
              disableOnPrefill: false,
            },
            {
              name: "test-text",
              type: "text",
              label: "test-text",
              hidden: false,
              sources: [{ id: "user", type: "user", label: "User", fieldRequired: true }],
              editable: "user",
              required: false,
              disableOnPrefill: false,
            },
            {
              name: "test-number",
              type: "number",
              label: "test-number",
              hidden: false,
              sources: [{ id: "user", type: "user", label: "User", fieldRequired: true }],
              editable: "user",
              required: false,
              disableOnPrefill: false,
            },
            {
              name: "test-textarea",
              type: "textarea",
              label: "test-textarea",
              hidden: false,
              sources: [{ id: "user", type: "user", label: "User", fieldRequired: true }],
              editable: "user",
              required: false,
              disableOnPrefill: false,
            },
            {
              name: "test-boolean",
              type: "boolean",
              label: "test-boolean",
              hidden: false,
              sources: [{ id: "user", type: "user", label: "User", fieldRequired: true }],
              editable: "user",
              required: false,
              labelAsSafeHtml: "<p>test-boolean</p>\n",
              disableOnPrefill: false,
            },
            {
              name: "test-url",
              type: "url",
              label: "test-url",
              hidden: false,
              sources: [{ id: "user", type: "user", label: "User", fieldRequired: true }],
              editable: "user",
              required: false,
              placeholder: "",
              labelAsSafeHtml: "<p>test-url</p>\n",
              disableOnPrefill: false,
            },
            {
              name: "test-multiemail",
              type: "multiemail",
              label: "test-multiemail",
              hidden: false,
              sources: [
                {
                  id: "user",
                  type: "user",
                  label: "User",
                  fieldRequired: true,
                },
              ],
              editable: "user",
              required: false,
              disableOnPrefill: false,
            },
            {
              name: "test-multiselect",
              type: "multiselect",
              label: "test-multiselect",
              hidden: false,
              options: [
                {
                  label: "apple",
                  value: "apple",
                },
                {
                  label: "orange",
                  value: "orange",
                },
              ],
              sources: [
                {
                  id: "user",
                  type: "user",
                  label: "User",
                  fieldRequired: true,
                },
              ],
              editable: "user",
              required: false,
              disableOnPrefill: false,
            },
            {
              name: "test-checkbox",
              type: "checkbox",
              label: "test-checkbox",
              hidden: false,
              options: [
                {
                  label: "blue",
                  value: "blue",
                },
                {
                  label: "red",
                  value: "red",
                },
              ],
              sources: [
                {
                  id: "user",
                  type: "user",
                  label: "User",
                  fieldRequired: true,
                },
              ],
              editable: "user",
              required: false,
              disableOnPrefill: false,
            },
            {
              name: "test-radio",
              type: "radio",
              label: "test-radio",
              hidden: false,
              options: [
                {
                  label: "pineapple",
                  value: "pineapple",
                },
              ],
              sources: [
                {
                  id: "user",
                  type: "user",
                  label: "User",
                  fieldRequired: true,
                },
              ],
              editable: "user",
              required: false,
              disableOnPrefill: false,
            },
            {
              name: "test-select",
              type: "select",
              label: "test-select",
              options: [
                {
                  label: "water",
                  value: "water",
                },
                {
                  label: "juice",
                  value: "juice",
                },
              ],
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
              placeholder: "",
              disableOnPrefill: false,
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
              name: "notes",
              type: "textarea",
              sources: [{ id: "default", type: "default", label: "Default" }],
              editable: "system-but-optional",
              required: false,
              defaultLabel: "additional_notes",
              defaultPlaceholder: "share_additional_notes",
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
          ],
        },
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
            id: eventTypeId,
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
      it("should get a seated booking with split name responses", async () => {
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
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should get a seated booking with split name responses", async () => {
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
              expect(data.attendees[0].name).toEqual(`${splitName.firstName} ${splitName.lastName}`);
              expect(data.attendees[0].bookingFieldsResponses.name).toEqual(splitName);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });
    });

    describe("make booking", () => {
      it("should not be able to book an event type with custom required booking fields if they are missing in bookingFieldsResponses", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
          eventTypeId: eventTypeWithBookingFields.id,
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
          eventTypeId: eventTypeWithBookingFields.id,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: "https://meet.google.com/abc-def-ghi",
          bookingFieldsResponses: {
            "favorite-movie": "lord of the rings",
            "video-url": "http://video-url.com",
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
              expect(data.bookingFieldsResponses["video-url"]).toEqual("http://video-url.com");
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });
    });

    describe("Booking Field Type Validation", () => {
      const basePayload = {
        start: new Date(Date.UTC(2030, 5, 19, 11, 0, 0)).toISOString(),
        attendee: {
          name: "Charlie TypeTest",
          email: "charlie.typetest@example.com",
          timeZone: "Europe/Madrid",
          language: "en",
        },
      };

      it("should reject with 400 if 'test-phone' (phone) is not a string", async () => {
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            "test-phone": 12345,
          },
        };
        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(
          "Invalid type for booking field 'test-phone'. Expected type string (compatible with field type 'phone'), but received number."
        );
      });

      it("should reject with 400 if 'test-address' (address) is not a string", async () => {
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            "test-address": true,
          },
        };
        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(
          "Invalid type for booking field 'test-address'. Expected type string (compatible with field type 'address'), but received boolean."
        );
      });

      it("should reject with 400 if 'test-text' (text) is not a string", async () => {
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            "test-text": 123,
          },
        };
        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(
          "Invalid type for booking field 'test-text'. Expected type string (compatible with field type 'text'), but received number."
        );
      });

      it("should reject with 400 if 'test-number' (number) is not a number", async () => {
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            "test-number": "123",
          },
        };
        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(
          "Invalid type for booking field 'test-number'. Expected type number (compatible with field type 'number'), but received string."
        );
      });

      it("should reject with 400 if 'test-textarea' (textarea) is not a string", async () => {
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            "test-textarea": { text: "invalid" },
          },
        };
        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(
          "Invalid type for booking field 'test-textarea'. Expected type string (compatible with field type 'textarea'), but received object."
        );
      });

      it("should reject with 400 if 'test-boolean' (boolean) is not a boolean", async () => {
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            "test-boolean": "true",
          },
        };
        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(
          "Invalid type for booking field 'test-boolean'. Expected type boolean (compatible with field type 'boolean'), but received string."
        );
      });

      it("should reject with 400 if 'test-url' (url) is not a string", async () => {
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            "test-url": 12345,
          },
        };
        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(
          "Invalid type for booking field 'test-url'. Expected type string (compatible with field type 'url'), but received number."
        );
      });

      it("should reject with 400 if 'test-multiemail' (multiemail) is not an array", async () => {
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            "test-multiemail": "not-an-array@example.com",
          },
        };
        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(
          "Invalid type for booking field 'test-multiemail'. Expected type array (compatible with field type 'multiemail'), but received string."
        );
      });

      it("should reject with 400 if 'test-multiselect' (multiselect) is not an array", async () => {
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            "test-multiselect": "not-an-array",
          },
        };
        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(
          "Invalid type for booking field 'test-multiselect'. Expected type array (compatible with field type 'multiselect'), but received string."
        );
      });

      it("should reject with 400 if 'test-checkbox' (checkbox) is not an array", async () => {
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            "test-checkbox": true,
          },
        };
        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(
          "Invalid type for booking field 'test-checkbox'. Expected type array (compatible with field type 'checkbox'), but received boolean."
        );
      });

      it("should reject with 400 if 'test-radio' (radio) is not a string or number", async () => {
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            "test-radio": true,
          },
        };
        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(
          "Invalid type for booking field 'test-radio'. Expected type string or number (compatible with field type 'radio'), but received boolean."
        );
      });

      it("should reject with 400 if 'test-select' (select) is not a string or number", async () => {
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            "test-select": true,
          },
        };
        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(
          "Invalid type for booking field 'test-select'. Expected type string or number (compatible with field type 'select'), but received boolean."
        );
      });

      it("should throw BadRequestException for test-select field with invalid option", async () => {
        const fieldName = "test-select";
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            [fieldName]: "INVALID_DRINK",
          },
        };

        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);

        expect(response.body.error.message).toBe(
          `Invalid option 'INVALID_DRINK' for booking field '${fieldName}'. Allowed options are: water, juice.`
        );
      });

      it("should throw BadRequestException for test-radio field with invalid option", async () => {
        const fieldName = "test-radio";
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            [fieldName]: "INVALID_FRUIT_FOR_RADIO",
          },
        };

        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);

        expect(response.body.error.message).toBe(
          `Invalid option 'INVALID_FRUIT_FOR_RADIO' for booking field '${fieldName}'. Allowed options are: pineapple.`
        );
      });

      it("should throw BadRequestException for test-multiselect field with an invalid option", async () => {
        const fieldName = "test-multiselect";
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            [fieldName]: ["apple", "INVALID_FRUIT"],
          },
        };

        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);

        expect(response.body.error.message).toBe(
          `One or more invalid options for booking field '${fieldName}'. Allowed options are: apple, orange.`
        );
      });

      it("should throw BadRequestException for test-checkbox field with invalid options", async () => {
        const fieldName = "test-checkbox";
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFielsCustom.id,
          bookingFieldsResponses: {
            [fieldName]: ["blue", "INVALID_COLOR"],
          },
        };

        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);

        expect(response.body.error.message).toBe(
          `One or more invalid options for booking field '${fieldName}'. Allowed options are: blue, red.`
        );
      });

      it("should transform null values to empty strings in bookingFieldsResponses", async () => {
        const payload = {
          ...basePayload,
          eventTypeId: eventTypeWithBookingFields.id,
          bookingFieldsResponses: {
            "favorite-movie": "The Matrix",
            rescheduleReason: null,
            notes: null,
          },
        };
        const response = await request(app.getHttpServer())
          .post(`/v2/bookings`)
          .send(payload)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);
        expect(response.status).toBe(201);
        expect(response.body.status).toEqual(SUCCESS_STATUS);

        if (responseDataIsBooking(response.body.data)) {
          const data: BookingOutput_2024_08_13 = response.body.data;
          expect(data.bookingFieldsResponses.notes).toBe("");
          expect(data.bookingFieldsResponses.rescheduleReason).toBe("");
          expect(data.bookingFieldsResponses["favorite-movie"]).toBe("The Matrix");
        }
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