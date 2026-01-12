import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import { BookingOutput_2024_08_13, GetBookingOutput_2024_08_13 } from "@calcom/platform-types";
import type { Booking, PlatformOAuthClient, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Bookings Endpoints 2024-08-13", () => {
  describe("Bookings confirmation", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let teamRepositoryFixture: TeamRepositoryFixture;

    const userEmail = `confirm-bookings-2024-08-13-user-${randomString()}@api.com`;
    let user: User;

    let eventTypeId: number;

    let createdBooking1: Booking;
    let createdBooking2: Booking;

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
        name: `confirm-bookings-2024-08-13-organization-${randomString()}`,
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
        name: `confirm-bookings-2024-08-13-${randomString()}-schedule`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);
      const event = await eventTypesRepositoryFixture.create(
        {
          title: `confirm-bookings-2024-08-13-${randomString()}-event-type`,
          slug: `confirm-bookings-2024-08-13-${randomString()}-event-type-slug`,
          length: 60,
        },
        user.id
      );
      eventTypeId = event.id;

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

    it("should confirm a booking", async () => {
      const status = "PENDING";
      createdBooking1 = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: user.id,
          },
        },
        startTime: new Date(Date.UTC(2050, 0, 7, 13, 0, 0)),
        endTime: new Date(Date.UTC(2050, 0, 7, 14, 0, 0)),
        title: "peer coding",
        uid: "peer-coding-one",
        eventType: {
          connect: {
            id: eventTypeId,
          },
        },
        location: "via 10, rome, italy",
        customInputs: {},
        metadata: {},
        responses: {
          name: "Bob",
          email: "bob@gmail.com",
        },
        attendees: {
          create: {
            email: "bob@gmail.com",
            name: "Bob",
            locale: "it",
            timeZone: "Europe/Rome",
          },
        },
        status,
      });
      expect(createdBooking1.status).toEqual("PENDING");

      return request(app.getHttpServer())
        .post(`/v2/bookings/${createdBooking1.uid}/confirm`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsBooking(responseBody.data)).toBe(true);

          if (responseDataIsBooking(responseBody.data)) {
            const data: BookingOutput_2024_08_13 = responseBody.data;
            expect(data.uid).toBeDefined();
            expect(data.status).toEqual("accepted");

            const dbBooking = await bookingsRepositoryFixture.getByUid(data.uid);
            expect(dbBooking?.status).toEqual("ACCEPTED");
          } else {
            throw new Error(
              "Invalid response data - expected booking but received array of possibly recurring bookings"
            );
          }
        });
    });

    it("should decline a booking", async () => {
      const status = "PENDING";
      createdBooking2 = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: user.id,
          },
        },
        startTime: new Date(Date.UTC(2050, 0, 7, 10, 0, 0)),
        endTime: new Date(Date.UTC(2050, 0, 7, 11, 0, 0)),
        title: "peer coding",
        uid: "peer-coding-two",
        eventType: {
          connect: {
            id: eventTypeId,
          },
        },
        location: "via 10, rome, italy",
        customInputs: {},
        metadata: {},
        responses: {
          name: "Bob",
          email: "bob@gmail.com",
        },
        attendees: {
          create: {
            email: "bob@gmail.com",
            name: "Bob",
            locale: "it",
            timeZone: "Europe/Rome",
          },
        },
        status,
      });
      expect(createdBooking2.status).toEqual("PENDING");

      return request(app.getHttpServer())
        .post(`/v2/bookings/${createdBooking2.uid}/decline`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsBooking(responseBody.data)).toBe(true);

          if (responseDataIsBooking(responseBody.data)) {
            const data: BookingOutput_2024_08_13 = responseBody.data;
            expect(data.uid).toBeDefined();
            expect(data.status).toEqual("rejected");

            const dbBooking = await bookingsRepositoryFixture.getByUid(data.uid);
            expect(dbBooking?.status).toEqual("REJECTED");
          } else {
            throw new Error(
              "Invalid response data - expected booking but received array of possibly recurring bookings"
            );
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
