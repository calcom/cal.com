import {
  CAL_API_VERSION_HEADER,
  ERROR_STATUS,
  SUCCESS_STATUS,
  VERSION_2024_08_13,
} from "@calcom/platform-constants";
import type { BookingOutput_2024_08_13 } from "@calcom/platform-types";
import { UpdateBookingLocationInput_2024_08_13 } from "@calcom/platform-types";
import type { Team } from "@calcom/prisma/client";
import { Booking } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { TokensRepositoryFixture } from "test/fixtures/repository/tokens.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { UpdateBookingLocationOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/update-location.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

type TestUser = {
  id: number;
  accessToken: string;
  refreshToken: string;
  email: string;
};

type TestSetup = {
  organizer: TestUser;
  unrelatedUser: TestUser;
  eventTypeId: number;
};

describe("Bookings Endpoints 2024-08-13 update booking location", () => {
  let app: INestApplication;
  let organization: Team;

  let userRepositoryFixture: UserRepositoryFixture;
  let bookingsRepositoryFixture: BookingsRepositoryFixture;
  let schedulesService: SchedulesService_2024_04_15;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let tokensRepositoryFixture: TokensRepositoryFixture;

  let testSetup: TestSetup;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, SchedulesModule_2024_04_15],
    })
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
    tokensRepositoryFixture = new TokensRepositoryFixture(moduleRef);

    organization = await teamRepositoryFixture.create({
      name: `update-booking-location-organization-${randomString()}`,
    });

    await setupTestData();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  describe("PATCH /v2/bookings/:bookingUid/location", () => {
    it("should return 401 when updating location without authentication", async () => {
      const { bookingUid } = await createBooking();

      await request(app.getHttpServer())
        .patch(`/v2/bookings/${bookingUid}/location`)
        .send({ location: "https://unauthenticated.example.com" })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(401);
    });

    describe("can update booking with different locations", () => {
      const address = "123 Main St";
      const link = "https://cal.com/join/123456";
      const phone = "+37121999999";

      let booking: Booking;
      let bookingId: number;
      let bookingUid: string;
      let eventTypeWithAllLocationsId: number;

      beforeAll(async () => {
        const createdEventType = await eventTypesRepositoryFixture.create(
          {
            title: "book using any location",
            slug: `book-using-any-location-${randomString()}`,
            length: 15,
            locations: [
              { type: "integrations:daily" },
              { type: "inPerson", address: "123 Main St", displayLocationPublicly: true },
              { type: "link", link: "https://cal.com/join/123456", displayLocationPublicly: true },
              { type: "userPhone", hostPhoneNumber: "+37121999999", displayLocationPublicly: true },
              { type: "attendeeInPerson" },
              { type: "phone" },
              { type: "somewhereElse" },
            ],
          },
          testSetup.organizer.id
        );

        eventTypeWithAllLocationsId = createdEventType.id;

        booking = await bookingsRepositoryFixture.create({
          uid: `booking-uid-${randomString(10)}`,
          title: "booking title",
          startTime: "2048-08-14T09:00:00.000Z",
          endTime: "2048-08-14T10:00:00.000Z",
          eventType: {
            connect: {
              id: eventTypeWithAllLocationsId,
            },
          },
          status: "ACCEPTED",
          metadata: {},
          responses: "null",
          user: {
            connect: {
              id: testSetup.organizer.id,
            },
          },
        });
        bookingUid = booking.uid;
        bookingId = booking.id;
      });

      it("can update location to type address", async () => {
        const updatedBookingBody: UpdateBookingLocationInput_2024_08_13 = {
          location: {
            type: "address",
            address: address,
          },
        };

        const updatedBookingResponse = await request(app.getHttpServer())
          .patch(`/v2/bookings/${bookingUid}/location`)
          .send(updatedBookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(200);

        const updatedBookingResponseBody: UpdateBookingLocationOutput_2024_08_13 =
          updatedBookingResponse.body;
        expect(updatedBookingResponseBody.status).toEqual(SUCCESS_STATUS);
        if (!responseDataIsBooking(updatedBookingResponseBody.data)) {
          throw new Error(
            "Invalid response data - expected booking but received array of possibly recurring bookings"
          );
        }
        const updatedBooking = updatedBookingResponseBody.data as BookingOutput_2024_08_13;
        expect(updatedBooking).toHaveProperty("id");
        expect(updatedBooking.location).toEqual(address);
      });

      it("can update location to type link", async () => {
        const updatedBookingBody: UpdateBookingLocationInput_2024_08_13 = {
          location: {
            type: "link",
            link: link,
          },
        };

        const updatedBookingResponse = await request(app.getHttpServer())
          .patch(`/v2/bookings/${bookingUid}/location`)
          .send(updatedBookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(200);

        const updatedBookingResponseBody: UpdateBookingLocationOutput_2024_08_13 =
          updatedBookingResponse.body;
        expect(updatedBookingResponseBody.status).toEqual(SUCCESS_STATUS);
        if (!responseDataIsBooking(updatedBookingResponseBody.data)) {
          throw new Error(
            "Invalid response data - expected booking but received array of possibly recurring bookings"
          );
        }
        const updatedBooking = updatedBookingResponseBody.data as BookingOutput_2024_08_13;
        expect(updatedBooking).toHaveProperty("id");
        expect(updatedBooking.location).toEqual(link);
      });

      it("can update location to type phone", async () => {
        const updatedBookingBody: UpdateBookingLocationInput_2024_08_13 = {
          location: {
            type: "phone",
            phone: phone,
          },
        };

        const updatedBookingResponse = await request(app.getHttpServer())
          .patch(`/v2/bookings/${bookingUid}/location`)
          .send(updatedBookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(200);

        const updatedBookingResponseBody: UpdateBookingLocationOutput_2024_08_13 =
          updatedBookingResponse.body;
        expect(updatedBookingResponseBody.status).toEqual(SUCCESS_STATUS);
        if (!responseDataIsBooking(updatedBookingResponseBody.data)) {
          throw new Error(
            "Invalid response data - expected booking but received array of possibly recurring bookings"
          );
        }
        const updatedBooking = updatedBookingResponseBody.data as BookingOutput_2024_08_13;
        expect(updatedBooking).toHaveProperty("id");
        expect(updatedBooking.location).toEqual(phone);
      });

      it("can update location to type attendeeAddress", async () => {
        const attendeeAddress = "123 Example St, City, Valhalla";
        const updatedBookingBody: UpdateBookingLocationInput_2024_08_13 = {
          location: {
            type: "attendeeAddress",
            address: attendeeAddress,
          },
        };

        const updatedBookingResponse = await request(app.getHttpServer())
          .patch(`/v2/bookings/${bookingUid}/location`)
          .send(updatedBookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(200);

        const updatedBookingResponseBody: UpdateBookingLocationOutput_2024_08_13 =
          updatedBookingResponse.body;
        expect(updatedBookingResponseBody.status).toEqual(SUCCESS_STATUS);
        if (!responseDataIsBooking(updatedBookingResponseBody.data)) {
          throw new Error(
            "Invalid response data - expected booking but received array of possibly recurring bookings"
          );
        }
        const updatedBooking = updatedBookingResponseBody.data as BookingOutput_2024_08_13;
        expect(updatedBooking).toHaveProperty("id");
        expect(updatedBooking.location).toEqual(attendeeAddress);
      });

      it("can update location to type attendeePhone", async () => {
        const attendeePhone = "+37120993151";
        const updatedBookingBody: UpdateBookingLocationInput_2024_08_13 = {
          location: {
            type: "attendeePhone",
            phone: attendeePhone,
          },
        };

        const updatedBookingResponse = await request(app.getHttpServer())
          .patch(`/v2/bookings/${bookingUid}/location`)
          .send(updatedBookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(200);

        const updatedBookingResponseBody: UpdateBookingLocationOutput_2024_08_13 =
          updatedBookingResponse.body;
        expect(updatedBookingResponseBody.status).toEqual(SUCCESS_STATUS);
        if (!responseDataIsBooking(updatedBookingResponseBody.data)) {
          throw new Error(
            "Invalid response data - expected booking but received array of possibly recurring bookings"
          );
        }
        const updatedBooking = updatedBookingResponseBody.data as BookingOutput_2024_08_13;
        expect(updatedBooking).toHaveProperty("id");
        expect(updatedBooking.location).toEqual(attendeePhone);
      });

      it("can update location to type attendeeDefined", async () => {
        const attendeeDefinedLocation = "namek 100";
        const updatedBookingBody: UpdateBookingLocationInput_2024_08_13 = {
          location: {
            type: "attendeeDefined",
            location: attendeeDefinedLocation,
          },
        };

        const updatedBookingResponse = await request(app.getHttpServer())
          .patch(`/v2/bookings/${bookingUid}/location`)
          .send(updatedBookingBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
          .expect(200);

        const updatedBookingResponseBody: UpdateBookingLocationOutput_2024_08_13 =
          updatedBookingResponse.body;
        expect(updatedBookingResponseBody.status).toEqual(SUCCESS_STATUS);
        if (!responseDataIsBooking(updatedBookingResponseBody.data)) {
          throw new Error(
            "Invalid response data - expected booking but received array of possibly recurring bookings"
          );
        }
        const updatedBooking = updatedBookingResponseBody.data as BookingOutput_2024_08_13;
        expect(updatedBooking).toHaveProperty("id");
        expect(updatedBooking.location).toEqual(attendeeDefinedLocation);
      });

      afterAll(async () => {
        if (responseDataIsBooking(booking)) {
          await bookingsRepositoryFixture.deleteById(bookingId);
        } else {
          throw new Error("Unexpected response data type");
        }
      });
    });

    it("should return booking unchanged when no location payload is provided", async () => {
      const initialLocation = `https://initial-${randomString()}.example.com`;
      const { bookingUid } = await createBooking(initialLocation);

      const response = await request(app.getHttpServer())
        .patch(`/v2/bookings/${bookingUid}/location`)
        .send({})
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
        .expect(200);

      const responseBody: UpdateBookingLocationOutput_2024_08_13 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      if (!responseDataIsBooking(responseBody.data)) {
        throw new Error(
          "Invalid response data - expected booking but received array of possibly recurring bookings"
        );
      }
      expect(responseBody.data.location).toEqual(initialLocation);
    });

    it("should return 403 when unrelated user attempts to update booking location", async () => {
      const { bookingUid } = await createBooking();

      await request(app.getHttpServer())
        .patch(`/v2/bookings/${bookingUid}/location`)
        .send({ location: { type: "link", link: "https://non-organizer.example.com" } })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${testSetup.unrelatedUser.accessToken}`)
        .expect(403);
    });

    it("should return 400 when invalid location payload is provided", async () => {
      const { bookingUid } = await createBooking();

      const response = await request(app.getHttpServer())
        .patch(`/v2/bookings/${bookingUid}/location`)
        .send({ location: { type: "invalid-location-type" } })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${testSetup.organizer.accessToken}`)
        .expect(400);

      expect(response.body.status).toEqual(ERROR_STATUS);
    });
  });

  afterAll(async () => {
    await teamRepositoryFixture.delete(organization.id);

    await userRepositoryFixture.deleteByEmail(testSetup.organizer.email);
    await userRepositoryFixture.deleteByEmail(testSetup.unrelatedUser.email);

    await bookingsRepositoryFixture.deleteAllBookings(testSetup.organizer.id, testSetup.organizer.email);

    await app.close();
  });

  async function setupTestData() {
    const oAuthClient = await createOAuthClient(organization.id);

    const organizerUser = await userRepositoryFixture.create({
      email: `update-booking-location-organizer-${randomString()}@api.com`,
      platformOAuthClients: {
        connect: { id: oAuthClient.id },
      },
    });

    const unrelatedUser = await userRepositoryFixture.create({
      email: `update-booking-location-unrelated-${randomString()}@api.com`,
      platformOAuthClients: {
        connect: { id: oAuthClient.id },
      },
    });

    const organizerTokens = await tokensRepositoryFixture.createTokens(organizerUser.id, oAuthClient.id);
    const unrelatedTokens = await tokensRepositoryFixture.createTokens(unrelatedUser.id, oAuthClient.id);

    const userSchedule: CreateScheduleInput_2024_04_15 = {
      name: `update-booking-location-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(organizerUser.id, userSchedule);

    const eventType = await eventTypesRepositoryFixture.create(
      {
        title: `update-booking-location-event-type-${randomString()}`,
        slug: `update-booking-location-event-type-${randomString()}`,
        length: 45,
      },
      organizerUser.id
    );

    testSetup = {
      organizer: {
        id: organizerUser.id,
        email: organizerUser.email,
        accessToken: organizerTokens.accessToken,
        refreshToken: organizerTokens.refreshToken,
      },
      unrelatedUser: {
        id: unrelatedUser.id,
        email: unrelatedUser.email,
        accessToken: unrelatedTokens.accessToken,
        refreshToken: unrelatedTokens.refreshToken,
      },
      eventTypeId: eventType.id,
    };
  }

  async function createOAuthClient(organizationId: number) {
    const data = {
      logo: "logo-url",
      name: "name",
      redirectUris: ["http://localhost:4444"],
      permissions: 32,
      areEmailsEnabled: true,
    };
    const secret = "secret";

    return oauthClientRepositoryFixture.create(organizationId, data, secret);
  }

  async function createBooking(location?: string) {
    const bookingLocation = location ?? `https://initial-${randomString()}.example.com`;
    const bookingUid = `booking-uid-${randomString(10)}`;

    await bookingsRepositoryFixture.create({
      uid: bookingUid,
      title: "booking title",
      startTime: new Date(Date.UTC(2035, 0, 9, 13, 0, 0)).toISOString(),
      endTime: new Date(Date.UTC(2035, 0, 9, 13, 45, 0)).toISOString(),
      eventType: {
        connect: {
          id: testSetup.eventTypeId,
        },
      },
      status: "ACCEPTED",
      metadata: {},
      responses: "null",
      location: bookingLocation,
      user: {
        connect: {
          id: testSetup.organizer.id,
        },
      },
    });

    return {
      bookingUid,
      location: bookingLocation,
    };
  }

  function responseDataIsBooking(data: unknown): data is BookingOutput_2024_08_13 {
    return !Array.isArray(data) && typeof data === "object" && data !== null && "id" in data;
  }
});
