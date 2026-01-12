import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_09_04 } from "@calcom/platform-constants";
import type { CreateScheduleInput_2024_06_11 } from "@calcom/platform-types";
import type { Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { expectedSlotsUTC } from "@/modules/slots/slots-2024-09-04/controllers/e2e/expected-slots";
import { GetSlotsOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-slots.output";
import { SlotsModule_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Slots 2024-09-04 Endpoints", () => {
  describe("Organization team event type slots", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let schedulesService: SchedulesService_2024_06_11;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;

    const sharedUsername = `slots-2024-09-04-shared-username-${randomString()}`;
    const sharedEventTypeSlug = `slots-2024-09-04-shared-event-type-slug-${randomString()}`;

    const orgUserEmailOne = `slots-2024-09-04-org-user-one-${randomString()}@api.com`;
    const orgUserEmailTwo = `slots-2024-09-04-org-user-two-${randomString()}@api.com`;

    const nonOrgUserEmailOne = `slots-2024-09-04-non-org-user-one-${randomString()}@api.com`;

    const orgSlug = `slots-2024-09-04-organization-${randomString()}`;
    let organization: Team;
    const teamSlug = `slots-2024-09-04-organization-team-${randomString()}`;
    let team: Team;
    let orgUserOne: User;
    let orgUserTwo: User;
    let collectiveEventTypeId: number;
    let collectiveEventTypeSlug: string;
    let roundRobinEventTypeId: number;
    let collectiveBookingId: number;
    let roundRobinBookingId: number;
    let fullyBookedRoundRobinBookingIdOne: number;
    let fullyBookedRoundRobinBookingIdTwo: number;

    let nonOrgUser: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        orgUserEmailOne,
        Test.createTestingModule({
          imports: [
            AppModule,
            PrismaModule,
            UsersModule,
            TokensModule,
            SchedulesModule_2024_06_11,
            SlotsModule_2024_09_04,
          ],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_06_11>(SchedulesService_2024_06_11);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);

      organization = await organizationsRepositoryFixture.create({
        name: orgSlug,
        isOrganization: true,
        slug: orgSlug,
        timeZone: "Europe/Rome",
      });

      orgUserOne = await userRepositoryFixture.create({
        email: orgUserEmailOne,
        name: orgUserEmailOne,
        username: orgUserEmailOne,
      });

      await eventTypesRepositoryFixture.create(
        { title: "frisbee match orgUserOne", slug: sharedEventTypeSlug, length: 60 },
        orgUserOne.id
      );

      orgUserTwo = await userRepositoryFixture.create({
        email: orgUserEmailTwo,
        name: orgUserEmailTwo,
        username: orgUserEmailTwo,
      });

      nonOrgUser = await userRepositoryFixture.create({
        email: nonOrgUserEmailOne,
        name: nonOrgUserEmailOne,
        username: sharedUsername,
      });

      await eventTypesRepositoryFixture.create(
        { title: "frisbee match nonOrgUser", slug: sharedEventTypeSlug, length: 60 },
        nonOrgUser.id
      );

      await profileRepositoryFixture.create({
        uid: `usr-${orgUserOne.id}`,
        username: sharedUsername,
        organization: {
          connect: {
            id: organization.id,
          },
        },
        user: {
          connect: {
            id: orgUserOne.id,
          },
        },
      });

      team = await teamRepositoryFixture.create({
        name: teamSlug,
        slug: teamSlug,
        isOrganization: false,
        parent: { connect: { id: organization.id } },
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: orgUserOne.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: orgUserTwo.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      const collectiveEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: team.id },
        },
        title: "Collective Event Type",
        slug: `slots-2024-09-04-org-collective-event-type-${randomString()}`,
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
        users: {
          connect: [{ id: orgUserOne.id }, { id: orgUserTwo.id }],
        },
      });
      collectiveEventTypeId = collectiveEventType.id;
      collectiveEventTypeSlug = collectiveEventType.slug;

      const roundRobinEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: team.id },
        },
        title: "RR Event Type",
        slug: `slots-2024-09-04-org-round-robin-event-type-${randomString()}`,
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
        users: {
          connect: [{ id: orgUserOne.id }, { id: orgUserTwo.id }],
        },
      });
      roundRobinEventTypeId = roundRobinEventType.id;

      const orgUsersSchedule: CreateScheduleInput_2024_06_11 = {
        name: "working time",
        timeZone: "Europe/Rome",
        isDefault: true,
      };

      const nonOrgUserSchedule: CreateScheduleInput_2024_06_11 = {
        name: "working time",
        timeZone: "Europe/Rome",
        isDefault: true,
        availability: [
          {
            days: ["Monday"],
            startTime: "09:00",
            endTime: "17:00",
          },
        ],
      };
      // note(Lauris): this creates default schedule monday to friday from 9AM to 5PM in Europe/Rome timezone
      await schedulesService.createUserSchedule(orgUserOne.id, orgUsersSchedule);
      await schedulesService.createUserSchedule(orgUserTwo.id, orgUsersSchedule);
      await schedulesService.createUserSchedule(nonOrgUser.id, nonOrgUserSchedule);

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    describe("org and non org user have the same username and event type slug", () => {
      it("should get org user event slots in UTC", async () => {
        return request(app.getHttpServer())
          .get(
            `/v2/slots?organizationSlug=${organization.slug}&eventTypeSlug=${sharedEventTypeSlug}&username=${sharedUsername}&start=2050-09-05&end=2050-09-09`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetSlotsOutput_2024_09_04 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            const slots = responseBody.data;

            expect(slots).toBeDefined();
            const days = Object.keys(slots);
            expect(days.length).toEqual(5);
            expect(slots).toEqual(expectedSlotsUTC);
          });
      });

      it("should get non org user event slots in UTC", async () => {
        return request(app.getHttpServer())
          .get(
            `/v2/slots?&eventTypeSlug=${sharedEventTypeSlug}&username=${sharedUsername}&start=2050-09-05&end=2050-09-09`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetSlotsOutput_2024_09_04 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            const slots = responseBody.data;

            expect(slots).toBeDefined();
            const days = Object.keys(slots);
            expect(days.length).toEqual(1);
            expect(slots).toEqual({ "2050-09-05": expectedSlotsUTC["2050-09-05"] });
          });
      });
    });

    it("should get collective team event slots in UTC", async () => {
      return request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${collectiveEventTypeId}&start=2050-09-05&end=2050-09-09`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetSlotsOutput_2024_09_04 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const slots = responseBody.data;

          expect(slots).toBeDefined();
          const days = Object.keys(slots);
          expect(days.length).toEqual(5);
          expect(slots).toEqual(expectedSlotsUTC);
        });
    });

    it("should get collective team event slots in UTC using teamSlug, eventTypeSlug and organizationSlug", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/slots?organizationSlug=${orgSlug}&teamSlug=${teamSlug}&eventTypeSlug=${collectiveEventTypeSlug}&start=2050-09-05&end=2050-09-09`
        )
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetSlotsOutput_2024_09_04 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const slots = responseBody.data;

          expect(slots).toBeDefined();
          const days = Object.keys(slots);
          expect(days.length).toEqual(5);
          expect(slots).toEqual(expectedSlotsUTC);
        });
    });

    it("should not get collective team event slots in UTC using teamSlug, eventTypeSlug if organizationSlug is missing", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/slots?teamSlug=${teamSlug}&eventTypeSlug=${collectiveEventTypeSlug}&start=2050-09-05&end=2050-09-09`
        )
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(404);
    });

    it("should get round robin team event slots in UTC", async () => {
      return request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${roundRobinEventTypeId}&start=2050-09-05&end=2050-09-09`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetSlotsOutput_2024_09_04 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const slots = responseBody.data;

          expect(slots).toBeDefined();
          const days = Object.keys(slots);
          expect(days.length).toEqual(5);
          expect(slots).toEqual(expectedSlotsUTC);
        });
    });

    it("should book collective event type and slot should not be available at that time", async () => {
      const startTime = "2050-09-05T11:00:00.000Z";
      const booking = await bookingsRepositoryFixture.create({
        uid: `booking-uid-${collectiveEventTypeId}`,
        title: "booking title",
        startTime,
        endTime: "2050-09-05T12:00:00.000Z",
        eventType: {
          connect: {
            id: collectiveEventTypeId,
          },
        },
        metadata: {},
        responses: {
          name: "tester",
          email: "tester@example.com",
          guests: [],
        },
        user: {
          connect: {
            id: orgUserOne.id,
          },
        },
      });
      collectiveBookingId = booking.id;

      const response = await request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${collectiveEventTypeId}&start=2050-09-05&end=2050-09-09`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const responseBody: GetSlotsOutput_2024_09_04 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const slots = responseBody.data;

      expect(slots).toBeDefined();
      const days = Object.keys(slots);
      expect(days.length).toEqual(5);

      const expectedSlotsUTC2050_09_05 = expectedSlotsUTC["2050-09-05"].filter(
        (slot) => slot.start !== startTime
      );
      expect(slots).toEqual({ ...expectedSlotsUTC, "2050-09-05": expectedSlotsUTC2050_09_05 });
      bookingsRepositoryFixture.deleteById(booking.id);
    });

    it("should book round robin event type and slot should be available at that time", async () => {
      const startTime = "2050-09-05T11:00:00.000Z";
      const booking = await bookingsRepositoryFixture.create({
        uid: `booking-uid-${roundRobinEventTypeId}`,
        title: "booking title",
        startTime,
        endTime: "2050-09-05T12:00:00.000Z",
        eventType: {
          connect: {
            id: roundRobinEventTypeId,
          },
        },
        metadata: {},
        responses: {
          name: "tester",
          email: "tester@example.com",
          guests: [],
        },
        user: {
          connect: {
            id: orgUserOne.id,
          },
        },
      });
      roundRobinBookingId = booking.id;

      const response = await request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${roundRobinEventTypeId}&start=2050-09-05&end=2050-09-09`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const responseBody: GetSlotsOutput_2024_09_04 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const slots = responseBody.data;

      expect(slots).toBeDefined();
      const days = Object.keys(slots);
      expect(days.length).toEqual(5);

      expect(slots).toEqual(expectedSlotsUTC);
      bookingsRepositoryFixture.deleteById(booking.id);
    });

    it("should fully book round robin event type and slot should not be available at that time", async () => {
      const startTime = "2050-09-05T11:00:00.000Z";
      const bookingOne = await bookingsRepositoryFixture.create({
        uid: `booking-uid-${roundRobinEventTypeId}-1`,
        title: "booking title",
        startTime,
        endTime: "2050-09-05T12:00:00.000Z",
        eventType: {
          connect: {
            id: roundRobinEventTypeId,
          },
        },
        metadata: {},
        responses: {
          name: "tester",
          email: "tester@example.com",
          guests: [],
        },
        user: {
          connect: {
            id: orgUserOne.id,
          },
        },
      });
      fullyBookedRoundRobinBookingIdOne = bookingOne.id;

      const bookingTwo = await bookingsRepositoryFixture.create({
        uid: `booking-uid-${roundRobinEventTypeId}-2`,
        title: "booking title",
        startTime,
        endTime: "2050-09-05T12:00:00.000Z",
        eventType: {
          connect: {
            id: roundRobinEventTypeId,
          },
        },
        metadata: {},
        responses: {
          name: "tester",
          email: "tester@example.com",
          guests: [],
        },
        user: {
          connect: {
            id: orgUserTwo.id,
          },
        },
      });
      fullyBookedRoundRobinBookingIdTwo = bookingTwo.id;

      const response = await request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${roundRobinEventTypeId}&start=2050-09-05&end=2050-09-09`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const responseBody: GetSlotsOutput_2024_09_04 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const slots = responseBody.data;

      expect(slots).toBeDefined();
      const days = Object.keys(slots);
      expect(days.length).toEqual(5);

      const expectedSlotsUTC2050_09_05 = expectedSlotsUTC["2050-09-05"].filter(
        (slot) => slot.start !== startTime
      );
      expect(slots).toEqual({ ...expectedSlotsUTC, "2050-09-05": expectedSlotsUTC2050_09_05 });
      bookingsRepositoryFixture.deleteById(bookingOne.id);
      bookingsRepositoryFixture.deleteById(bookingTwo.id);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(orgUserOne.email);
      await userRepositoryFixture.deleteByEmail(orgUserTwo.email);
      await teamRepositoryFixture.delete(team.id);
      await organizationsRepositoryFixture.delete(organization.id);
      await bookingsRepositoryFixture.deleteById(collectiveBookingId);
      await bookingsRepositoryFixture.deleteById(roundRobinBookingId);
      await bookingsRepositoryFixture.deleteById(fullyBookedRoundRobinBookingIdOne);
      await bookingsRepositoryFixture.deleteById(fullyBookedRoundRobinBookingIdTwo);
      await app.close();
    });
  });
});
