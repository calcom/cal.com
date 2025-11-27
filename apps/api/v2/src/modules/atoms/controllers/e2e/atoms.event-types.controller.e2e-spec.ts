import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { EventType, User } from "@calcom/prisma/client";

describe("Atoms Event Types Controller", () => {
  describe("PATCH /v2/atoms/event-types/:eventTypeId - Seats Fields", () => {
    let app: INestApplication;
    let userRepositoryFixture: UserRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;

    const userEmail = `atoms-seats-test-${randomString()}@api.com`;
    let user: User;
    let eventTypeWithSeats: EventType;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
      });

      // Create an event type with seats enabled and known initial values
      eventTypeWithSeats = await eventTypesRepositoryFixture.create(
        {
          title: `Seats Test Event ${randomString()}`,
          slug: `seats-test-${randomString()}`,
          length: 60,
          seatsPerTimeSlot: 5,
          seatsShowAttendees: false,
          seatsShowAvailabilityCount: false,
        },
        user.id
      );
    });

    afterAll(async () => {
      await userRepositoryFixture.delete(user.id);
      await app.close();
    });

    it("should update seatsShowAttendees field via PATCH", async () => {
      // Act: Update seatsShowAttendees to true
      const updateResponse = await request(app.getHttpServer())
        .patch(`/v2/atoms/event-types/${eventTypeWithSeats.id}`)
        .send({
          seatsShowAttendees: true,
        })
        .expect(200);

      expect(updateResponse.body.status).toBe(SUCCESS_STATUS);

      // Assert: Verify the field was updated by fetching the event type
      const getResponse = await request(app.getHttpServer())
        .get(`/v2/atoms/event-types/${eventTypeWithSeats.id}`)
        .expect(200);

      expect(getResponse.body.status).toBe(SUCCESS_STATUS);
      expect(getResponse.body.data.seatsShowAttendees).toBe(true);
    });

    it("should update seatsShowAvailabilityCount field via PATCH", async () => {
      // Act: Update seatsShowAvailabilityCount to true
      const updateResponse = await request(app.getHttpServer())
        .patch(`/v2/atoms/event-types/${eventTypeWithSeats.id}`)
        .send({
          seatsShowAvailabilityCount: true,
        })
        .expect(200);

      expect(updateResponse.body.status).toBe(SUCCESS_STATUS);

      // Assert: Verify the field was updated by fetching the event type
      const getResponse = await request(app.getHttpServer())
        .get(`/v2/atoms/event-types/${eventTypeWithSeats.id}`)
        .expect(200);

      expect(getResponse.body.status).toBe(SUCCESS_STATUS);
      expect(getResponse.body.data.seatsShowAvailabilityCount).toBe(true);
    });

    it("should update both seats fields simultaneously via PATCH", async () => {
      // First, reset both fields to false
      await request(app.getHttpServer())
        .patch(`/v2/atoms/event-types/${eventTypeWithSeats.id}`)
        .send({
          seatsShowAttendees: false,
          seatsShowAvailabilityCount: false,
        })
        .expect(200);

      // Act: Update both fields to true in a single request
      const updateResponse = await request(app.getHttpServer())
        .patch(`/v2/atoms/event-types/${eventTypeWithSeats.id}`)
        .send({
          seatsShowAttendees: true,
          seatsShowAvailabilityCount: true,
        })
        .expect(200);

      expect(updateResponse.body.status).toBe(SUCCESS_STATUS);

      // Assert: Verify both fields were updated
      const getResponse = await request(app.getHttpServer())
        .get(`/v2/atoms/event-types/${eventTypeWithSeats.id}`)
        .expect(200);

      expect(getResponse.body.status).toBe(SUCCESS_STATUS);
      expect(getResponse.body.data.seatsShowAttendees).toBe(true);
      expect(getResponse.body.data.seatsShowAvailabilityCount).toBe(true);
    });

    it("should toggle seatsShowAttendees from true to false", async () => {
      // First, set to true
      await request(app.getHttpServer())
        .patch(`/v2/atoms/event-types/${eventTypeWithSeats.id}`)
        .send({
          seatsShowAttendees: true,
        })
        .expect(200);

      // Act: Toggle to false
      const updateResponse = await request(app.getHttpServer())
        .patch(`/v2/atoms/event-types/${eventTypeWithSeats.id}`)
        .send({
          seatsShowAttendees: false,
        })
        .expect(200);

      expect(updateResponse.body.status).toBe(SUCCESS_STATUS);

      // Assert: Verify the field was toggled to false
      const getResponse = await request(app.getHttpServer())
        .get(`/v2/atoms/event-types/${eventTypeWithSeats.id}`)
        .expect(200);

      expect(getResponse.body.status).toBe(SUCCESS_STATUS);
      expect(getResponse.body.data.seatsShowAttendees).toBe(false);
    });

    it("should toggle seatsShowAvailabilityCount from true to false", async () => {
      // First, set to true
      await request(app.getHttpServer())
        .patch(`/v2/atoms/event-types/${eventTypeWithSeats.id}`)
        .send({
          seatsShowAvailabilityCount: true,
        })
        .expect(200);

      // Act: Toggle to false
      const updateResponse = await request(app.getHttpServer())
        .patch(`/v2/atoms/event-types/${eventTypeWithSeats.id}`)
        .send({
          seatsShowAvailabilityCount: false,
        })
        .expect(200);

      expect(updateResponse.body.status).toBe(SUCCESS_STATUS);

      // Assert: Verify the field was toggled to false
      const getResponse = await request(app.getHttpServer())
        .get(`/v2/atoms/event-types/${eventTypeWithSeats.id}`)
        .expect(200);

      expect(getResponse.body.status).toBe(SUCCESS_STATUS);
      expect(getResponse.body.data.seatsShowAvailabilityCount).toBe(false);
    });
  });
});
