import { describe, expect, beforeEach, afterEach, it } from "vitest";

import type { Field as FormField } from "@calcom/app-store/routing-forms/types/types";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

describe("RoutingFormResponseDenormalized", () => {
  let userId: number;
  let formId: string;
  let eventTypeId: number;
  let bookingId: number;
  let responseId: number;
  const randomId = Math.floor(Math.random() * 1000000);
  const email = `booking-denorm-${randomId}@example.com`;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email,
        username: `booking-denorm-testuser-${randomId}`,
        name: "Test User",
      },
    });
    userId = user.id;

    // Create test event type
    const eventType = await prisma.eventType.create({
      data: {
        title: "Test Event",
        slug: "test-event",
        length: 60,
        userId: user.id,
      },
    });
    eventTypeId = eventType.id;

    // Create test form
    const form = await prisma.app_RoutingForms_Form.create({
      data: {
        name: "Test Form",
        userId: user.id,
        fields: [
          {
            id: "57734f65-8bbb-4065-9e71-fb7f0b7485f8",
            type: "text",
            label: "Manager",
            required: true,
          },
          {
            id: "674c169a-e40a-492c-b4bb-6f5213873bd6",
            type: "select",
            label: "Location",
            required: true,
            options: [
              {
                id: "a33f39e2-0846-45a1-bb77-3cba2e18817c",
                label: "New York",
              },
            ],
          },
          {
            id: "83316968-45bf-4c9d-b5d4-5368a8d2d2a8",
            type: "multiselect",
            label: "skills",
            required: false,
            options: [
              {
                id: "ee494e36-1f15-4a04-b88e-fc4795e57eb1",
                label: "JavaScript",
              },
              {
                id: "34c50dca-9eed-4ade-89d4-9b2ccda52acc",
                label: "TypeScript",
              },
            ],
          },
          {
            id: "dd28ffcf-7029-401e-bddb-ce2e7496a1c1",
            type: "email",
            label: "Email",
            required: true,
          },
          {
            id: "f4e9fa6c-5c5d-4d8e-b15c-7f37e9d0c729",
            type: "number",
            label: "Rating",
            required: false,
          },
        ],
      },
    });
    formId = form.id;

    // Create test booking
    const booking = await prisma.booking.create({
      data: {
        uid: `booking-denorm-${randomId}`,
        title: "Test Booking",
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        userId: user.id,
        eventTypeId: eventType.id,
        status: BookingStatus.PENDING,
      },
    });
    bookingId = booking.id;

    // Create test form response
    const formResponse = await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formFillerId: "test-filler",
        formId: form.id,
        response: {
          "57734f65-8bbb-4065-9e71-fb7f0b7485f8": {
            label: "Manager",
            value: "Miss Dora Farrell",
          },
          "674c169a-e40a-492c-b4bb-6f5213873bd6": {
            label: "Location",
            value: "a33f39e2-0846-45a1-bb77-3cba2e18817c",
          },
          "83316968-45bf-4c9d-b5d4-5368a8d2d2a8": {
            label: "skills",
            value: ["ee494e36-1f15-4a04-b88e-fc4795e57eb1", "34c50dca-9eed-4ade-89d4-9b2ccda52acc"],
          },
          "dd28ffcf-7029-401e-bddb-ce2e7496a1c1": {
            label: "Email",
            value: "Felicity.Schuppe9@gmail.com",
          },
          "f4e9fa6c-5c5d-4d8e-b15c-7f37e9d0c729": {
            label: "Rating",
            value: 1,
          },
        },
        routedToBookingUid: booking.uid,
      },
    });
    responseId = formResponse.id;
  });

  afterEach(async () => {
    // Clean up test data in reverse order of creation
    if (bookingId) {
      await prisma.booking.deleteMany({
        where: { id: bookingId },
      });
    }
    if (responseId) {
      await prisma.app_RoutingForms_FormResponse.deleteMany({
        where: { id: responseId },
      });
    }
    if (formId) {
      await prisma.app_RoutingForms_Form.deleteMany({
        where: { id: formId },
      });
    }
    if (eventTypeId) {
      await prisma.eventType.deleteMany({
        where: { id: eventTypeId },
      });
    }
    if (userId) {
      await prisma.user.deleteMany({
        where: { id: userId },
      });
    }
  });

  describe("Creation and Updates", () => {
    it("should create denormalized entry when form response is created", async () => {
      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: responseId },
      });

      // Verify form fields are properly stored
      const formWithFields = await prisma.app_RoutingForms_Form.findUniqueOrThrow({
        where: { id: formId },
      });

      const fields = formWithFields.fields as FormField[];
      if (!fields) {
        throw new Error("Form fields are required for this test");
      }

      expect(fields).toHaveLength(5);
      expect(fields[0]).toEqual({
        id: "57734f65-8bbb-4065-9e71-fb7f0b7485f8",
        type: "text",
        label: "Manager",
        required: true,
      });
      expect(fields[2].options).toHaveLength(2); // Verify multiselect options

      // Verify the rest of the denormalized data
      expect(denormalizedResponse.formId).toBe(formId);
      expect(denormalizedResponse.formName).toBe("Test Form");
      expect(denormalizedResponse.formUserId).toBe(userId);
      expect(denormalizedResponse.bookingId).toBe(bookingId);
      expect(denormalizedResponse.bookingUserId).toBe(userId);
      expect(denormalizedResponse.bookingUserName).toBe("Test User");
      expect(denormalizedResponse.bookingUserEmail).toBe(email);
      expect(denormalizedResponse.eventTypeId).toBe(eventTypeId);
    });

    it("should update denormalized entry when form response is updated", async () => {
      await prisma.app_RoutingForms_FormResponse.update({
        where: { id: responseId },
        data: {
          response: {
            "57734f65-8bbb-4065-9e71-fb7f0b7485f8": {
              label: "Manager",
              value: "Updated Manager Name",
            },
            "674c169a-e40a-492c-b4bb-6f5213873bd6": {
              label: "Location",
              value: "a33f39e2-0846-45a1-bb77-3cba2e18817c",
            },
            "83316968-45bf-4c9d-b5d4-5368a8d2d2a8": {
              label: "skills",
              value: ["ee494e36-1f15-4a04-b88e-fc4795e57eb1"],
            },
            "dd28ffcf-7029-401e-bddb-ce2e7496a1c1": {
              label: "Email",
              value: "updated.email@example.com",
            },
            "f4e9fa6c-5c5d-4d8e-b15c-7f37e9d0c729": {
              label: "Rating",
              value: 2,
            },
          },
        },
      });

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: responseId },
        include: {
          response: true,
        },
      });

      // Verify the response was updated
      const formResponse = await prisma.app_RoutingForms_FormResponse.findUniqueOrThrow({
        where: { id: responseId },
      });

      expect(formResponse.response).toEqual(denormalizedResponse.response.response);
    });
  });
});
