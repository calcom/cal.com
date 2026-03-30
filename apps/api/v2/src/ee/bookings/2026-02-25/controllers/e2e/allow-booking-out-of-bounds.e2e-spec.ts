import { CAL_API_VERSION_HEADER, SUCCESS_STATUS } from "@calcom/platform-constants";
import { VERSION_2026_02_25 } from "@calcom/platform-constants";
import type { BookingOutput_2024_08_13, CreateBookingInput_2024_08_13 } from "@calcom/platform-types";
import type { PlatformOAuthClient, Team, User } from "@calcom/prisma/client";
import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Bookings Endpoints 2026-02-25 - allowBookingOutOfBounds", () => {
  let app: INestApplication;
  let organization: Team;

  let userRepositoryFixture: UserRepositoryFixture;
  let schedulesService: SchedulesService_2024_04_15;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let oAuthClient: PlatformOAuthClient;

  const hostEmail = `host-oob-${randomString()}@api.com`;
  let host: User;

  let eventTypeId: number;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      hostEmail,
      Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, SchedulesModule_2024_04_15],
      })
    )
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: (): boolean => true,
      })
      .compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

    organization = await teamRepositoryFixture.create({
      name: `oob-org-${randomString()}`,
      isOrganization: true,
    });

    oAuthClient = await createOAuthClient(organization.id);

    host = await userRepositoryFixture.create({
      email: hostEmail,
      username: hostEmail,
      platformOAuthClients: {
        connect: {
          id: oAuthClient.id,
        },
      },
    });

    const userSchedule: CreateScheduleInput_2024_04_15 = {
      name: `oob-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(host.id, userSchedule);

    const eventType = await eventTypesRepositoryFixture.create(
      {
        title: `oob-event-type-${randomString()}`,
        slug: `oob-event-type-${randomString()}`,
        length: 60,
      },
      host.id
    );
    eventTypeId = eventType.id;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  async function createOAuthClient(organizationId: number): Promise<PlatformOAuthClient> {
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
    expect(host).toBeDefined();
  });

  describe("host with allowBookingOutOfBounds=true", () => {
    it("should create a booking with allowBookingOutOfBounds when user is a host", async () => {
      // Use a date far in the future that would normally be out of bounds
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
        eventTypeId,
        attendee: {
          name: "Mr OOB",
          email: "oob_attendee@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
        location: "https://meet.google.com/abc-def-ghi",
        allowBookingOutOfBounds: true,
      };

      return request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2026_02_25)
        .expect(201)
        .then(async (response) => {
          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          const data = responseBody.data as BookingOutput_2024_08_13;
          expect(data.id).toBeDefined();
          expect(data.uid).toBeDefined();
          expect(data.hosts[0].id).toEqual(host.id);
          expect(data.eventTypeId).toEqual(eventTypeId);
          expect(data.status).toEqual("accepted");
        });
    });
  });

  describe("host without allowBookingOutOfBounds", () => {
    it("should create a booking normally without the flag", async () => {
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 9, 13, 0, 0)).toISOString(),
        eventTypeId,
        attendee: {
          name: "Mr Normal",
          email: "normal_attendee@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
        location: "https://meet.google.com/abc-def-ghi",
      };

      return request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2026_02_25)
        .expect(201)
        .then(async (response) => {
          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          const data = responseBody.data as BookingOutput_2024_08_13;
          expect(data.id).toBeDefined();
          expect(data.uid).toBeDefined();
          expect(data.hosts[0].id).toEqual(host.id);
          expect(data.eventTypeId).toEqual(eventTypeId);
        });
    });
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(host.email);
    await teamRepositoryFixture.delete(organization.id);
    await app.close();
  });
});
