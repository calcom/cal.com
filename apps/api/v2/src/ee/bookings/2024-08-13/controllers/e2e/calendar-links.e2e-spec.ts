import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
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
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import { Booking, PlatformOAuthClient, Team } from "@calcom/prisma/client";

describe("Bookings Endpoints 2024-08-13", () => {
  describe("Calendar Links", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let teamRepositoryFixture: TeamRepositoryFixture;

    const userEmail = `calendar-links-2024-08-13-user-${randomString()}@api.com`;
    let user: User;
    let booking: Booking;

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
        name: `calendar-links-2024-08-13-${randomString()}-schedule`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);
      const event = await eventTypesRepositoryFixture.create(
        {
          title: `calendar-links-2024-08-13-${randomString()}-event-type`,
          slug: `calendar-links-2024-08-13-${randomString()}-event-type-slug`,
          length: 60,
        },
        user.id
      );

      booking = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: user.id,
          },
        },
        startTime: new Date(Date.UTC(2020, 0, 8, 12, 0, 0)),
        endTime: new Date(Date.UTC(2020, 0, 8, 13, 0, 0)),
        uid: `calendar-links-2024-08-13-booking-${randomString()}`,
        title: "Test Booking",
        eventType: {
          connect: {
            id: event.id,
          },
        },
        location: "integrations:daily",
        customInputs: {},
        metadata: {},
        attendees: {
          create: {
            email: "oldie@gmail.com",
            name: "Oldie Goldie",
            locale: "lv",
            timeZone: "Europe/Rome",
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

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
      expect(booking).toBeDefined();
    });

    it.only("should get calendar links for a booking", async () => {
      const response = await request(app.getHttpServer())
        .get(`/v2/bookings/${booking.uid}/calendar-links`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200);

      expect(response.body.status).toEqual(SUCCESS_STATUS);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.googleCalendar).toBeDefined();
      expect(response.body.data.office365).toBeDefined();
      expect(response.body.data.ics).toBeDefined();

      // Check Google Calendar link
      expect(response.body.data.googleCalendar).toContain(
        "https://calendar.google.com/calendar/r/eventedit?dates="
      );
      expect(response.body.data.googleCalendar).toContain("&text=Test%20Booking");

      // Check Office 365 link
      expect(response.body.data.office365).toContain(
        "https://outlook.office.com/calendar/0/deeplink/compose"
      );
      expect(response.body.data.office365).toContain("&subject=Test%20Booking");

      // Check ICS file link
      expect(response.body.data.ics).toContain("data:text/calendar,");
    });

    it("should return 404 for non-existent booking", async () => {
      await request(app.getHttpServer())
        .get(`/v2/bookings/non-existent-uid/calendar-links`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(404);
    });

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(user.email);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await app.close();
    });
  });
});
