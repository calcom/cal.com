import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { prisma } from "@calcom/prisma";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";

describe("RoutingFormResponseDenormalized", () => {
  let userId: number;
  let formId: string;
  let eventTypeId: number;
  let bookingId: number;
  let responseId: number;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        username: "testuser",
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
        uid: "test-booking",
        title: "Test Booking",
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        userId: user.id,
        eventTypeId: eventType.id,
        status: BookingStatus.ACCEPTED,
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
    await prisma.booking.deleteMany({
      where: { id: bookingId },
    });
    await prisma.app_RoutingForms_FormResponse.deleteMany({
      where: { id: responseId },
    });
    await prisma.app_RoutingForms_Form.deleteMany({
      where: { id: formId },
    });
    await prisma.eventType.deleteMany({
      where: { id: eventTypeId },
    });
    await prisma.user.deleteMany({
      where: { id: userId },
    });
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

      expect(formWithFields.fields).not.toBeNull();
      expect(formWithFields.fields!).toHaveLength(5);
      expect(formWithFields.fields![0]).toEqual({
        id: "57734f65-8bbb-4065-9e71-fb7f0b7485f8",
        type: "text",
        label: "Manager",
        required: true,
      });
      expect(formWithFields.fields![2].options).toHaveLength(2); // Verify multiselect options

      // Verify the rest of the denormalized data
      expect(denormalizedResponse.formId).toBe(formId);
      expect(denormalizedResponse.formName).toBe("Test Form");
      expect(denormalizedResponse.formUserId).toBe(userId);
      expect(denormalizedResponse.bookingId).toBe(bookingId);
      expect(denormalizedResponse.bookingUserId).toBe(userId);
      expect(denormalizedResponse.bookingUserName).toBe("Test User");
      expect(denormalizedResponse.bookingUserEmail).toBe("test@example.com");
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

    it("should update denormalized entry when user is updated", async () => {
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: "Updated User",
          email: "updated@example.com",
        },
      });

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: responseId },
      });

      expect(denormalizedResponse.bookingUserName).toBe("Updated User");
      expect(denormalizedResponse.bookingUserEmail).toBe("updated@example.com");
    });

    it("should update denormalized entry when booking is updated", async () => {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
        },
      });

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: responseId },
      });

      expect(denormalizedResponse.bookingStatus).toBe(BookingStatus.CANCELLED);
    });

    it("should update denormalized entry when event type is updated", async () => {
      // Create a parent event type
      const parentEventType = await prisma.eventType.create({
        data: {
          title: "Parent Event",
          slug: "parent-event",
          length: 60,
          userId: userId,
        },
      });

      await prisma.eventType.update({
        where: { id: eventTypeId },
        data: {
          schedulingType: SchedulingType.ROUND_ROBIN,
          parentId: parentEventType.id,
        },
      });

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: responseId },
      });

      expect(denormalizedResponse.eventTypeId).toBe(eventTypeId);
      expect(denormalizedResponse.eventTypeParentId).toBe(parentEventType.id);
      expect(denormalizedResponse.eventTypeSchedulingType).toBe("roundRobin");

      // Clean up the parent event type
      await prisma.eventType.delete({
        where: { id: parentEventType.id },
      });
    });
  });

  describe("Deletion Scenarios", () => {
    it("should delete denormalized entry when form response is deleted", async () => {
      await prisma.app_RoutingForms_FormResponse.delete({
        where: { id: responseId },
      });

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUnique({
        where: { id: responseId },
      });

      expect(denormalizedResponse).toBeNull();
    });

    it("should not delete denormalized entry but nullify booking data when booking is deleted", async () => {
      // Check if denormalized entry exists before deletion
      const beforeDelete = await prisma.routingFormResponseDenormalized.findUnique({
        where: { id: responseId },
      });
      console.log("Before delete:", beforeDelete);

      await prisma.booking.delete({
        where: { id: bookingId },
      });

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: responseId },
      });

      expect(denormalizedResponse).not.toBeNull();
      expect(denormalizedResponse.bookingId).toBeNull();
      expect(denormalizedResponse.bookingStatus).toBeNull();
      expect(denormalizedResponse.bookingStartTime).toBeNull();
      expect(denormalizedResponse.bookingEndTime).toBeNull();
    });

    it("should cascade delete denormalized entries when form is deleted", async () => {
      await prisma.app_RoutingForms_Form.delete({
        where: { id: formId },
      });

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUnique({
        where: { id: responseId },
      });

      expect(denormalizedResponse).toBeNull();
    });

    it("should cascade delete denormalized entries when user is deleted", async () => {
      await prisma.user.delete({
        where: { id: userId },
      });

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUnique({
        where: { id: responseId },
      });

      expect(denormalizedResponse).toBeNull();
    });

    it("should not delete but nullify event type data when event type is deleted", async () => {
      await prisma.eventType.delete({
        where: { id: eventTypeId },
      });

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: responseId },
      });

      expect(denormalizedResponse).not.toBeNull();
      expect(denormalizedResponse.eventTypeId).toBeNull();
      expect(denormalizedResponse.eventTypeParentId).toBeNull();
    });
  });

  describe("Multiple Records Scenarios", () => {
    it("should handle multiple form responses for the same form", async () => {
      const response2 = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: "test-filler-2",
          formId: formId,
          response: { test: "response 2" },
        },
      });

      const denormalizedResponse1 = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: responseId },
      });
      const denormalizedResponse2 = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: response2.id },
      });

      expect(denormalizedResponse1.formId).toBe(formId);
      expect(denormalizedResponse2.formId).toBe(formId);
      expect(denormalizedResponse1.bookingId).toBe(bookingId);
      expect(denormalizedResponse2.bookingId).toBeNull();
      expect(denormalizedResponse1.id).not.toBe(denormalizedResponse2.id);
    });
  });

  describe("Edge Cases", () => {
    it("should handle null values in optional fields", async () => {
      const responseWithNulls = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: "test-filler-nulls",
          formId: formId,
          response: {
            "57734f65-8bbb-4065-9e71-fb7f0b7485f8": {
              label: "Manager",
              value: null,
            },
            "674c169a-e40a-492c-b4bb-6f5213873bd6": {
              label: "Location",
              value: null,
            },
          },
        },
      });

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: responseWithNulls.id },
      });

      expect(denormalizedResponse.bookingId).toBeNull();
      expect(denormalizedResponse.bookingStatus).toBeNull();
      expect(denormalizedResponse.eventTypeId).toBeNull();
    });

    it("should handle special characters in text fields", async () => {
      const specialChars = "Test 'quotes' and \"double quotes\" and \\ backslashes";
      await prisma.app_RoutingForms_Form.update({
        where: { id: formId },
        data: {
          name: specialChars,
        },
      });

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: responseId },
      });

      expect(denormalizedResponse.formName).toBe(specialChars);
    });
  });

  describe("Data Integrity", () => {
    it("should maintain correct relationships across all tables", async () => {
      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: responseId },
        include: {
          response: true,
          booking: true,
        },
      });

      expect(denormalizedResponse.formId).toBe(formId);
      expect(denormalizedResponse.bookingId).toBe(bookingId);
      expect(denormalizedResponse.response.formId).toBe(formId);
      expect(denormalizedResponse.booking?.id).toBe(bookingId);
    });
  });
});
