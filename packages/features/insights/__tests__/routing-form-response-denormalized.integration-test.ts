import type { Field as FormField } from "@calcom/app-store/routing-forms/types/types";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("RoutingFormResponseDenormalized", () => {
  let userId: number;
  let formId: string;
  let eventTypeId: number;
  let bookingId: number;
  let responseId: number;
  const randomId = Math.floor(Math.random() * 1000000);
  const email = `routing-form-response-denorm-${randomId}@example.com`;
  const updatedEmail = `updated-${email}`;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email,
        username: `routing-form-response-denorm-testuser-${randomId}`,
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
        uid: `routing-form-response-denorm-${randomId}`,
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

    it("should update denormalized entry when user is updated", async () => {
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: "Updated User",
          email: updatedEmail,
        },
      });

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: responseId },
      });

      expect(denormalizedResponse.bookingUserName).toBe("Updated User");
      expect(denormalizedResponse.bookingUserEmail).toBe(updatedEmail);
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
          response: {},
        },
      });

      const denormalizedResponse1 = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: responseId },
      });
      const denormalizedResponse2 = await prisma.routingFormResponseDenormalized.findUniqueOrThrow({
        where: { id: response2.id },
      });

      // clean up
      await prisma.app_RoutingForms_FormResponse.delete({
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

  describe("Field Filtering and Relationships", () => {
    it("should allow filtering by field values including arrays", async () => {
      // Create a response with specific field values for testing
      const formResponse = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: "test-filler-fields",
          formId: formId,
          response: {
            "83316968-45bf-4c9d-b5d4-5368a8d2d2a8": {
              label: "skills",
              value: ["644e7f80-b76b-4a3c-94f7-bf0efa65d3d6", "34c50dca-9eed-4ade-89d4-9b2ccda52acc"],
            },
          },
        },
      });

      // First verify the denormalized records were created
      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUnique({
        where: { id: formResponse.id },
        include: { fields: true },
      });

      expect(denormalizedResponse).not.toBeNull();
      expect(denormalizedResponse?.fields).toBeDefined();
      expect(denormalizedResponse?.fields).toHaveLength(1);

      // Test filtering by string array (skills)
      const arrayFilterResult = await prisma.routingFormResponseDenormalized.findMany({
        where: {
          fields: {
            some: {
              fieldId: "83316968-45bf-4c9d-b5d4-5368a8d2d2a8",
              valueStringArray: {
                has: "644e7f80-b76b-4a3c-94f7-bf0efa65d3d6",
              },
            },
          },
        },
        include: {
          fields: true,
        },
      });

      expect(arrayFilterResult).toHaveLength(1);
      expect(arrayFilterResult[0].fields).toBeDefined();
      expect(arrayFilterResult[0].fields).toHaveLength(1);
      expect(
        arrayFilterResult[0].fields.some(
          (field) =>
            field.fieldId === "83316968-45bf-4c9d-b5d4-5368a8d2d2a8" &&
            field.valueStringArray?.includes("644e7f80-b76b-4a3c-94f7-bf0efa65d3d6")
        )
      ).toBe(true);

      // Clean up
      await prisma.routingFormResponseField.deleteMany({
        where: { responseId: formResponse.id },
      });
      await prisma.routingFormResponseDenormalized.deleteMany({
        where: { id: formResponse.id },
      });
      await prisma.app_RoutingForms_FormResponse.delete({
        where: { id: formResponse.id },
      });
    });

    it("should allow filtering by string and number field values", async () => {
      // Create a response with specific field values for testing
      const formResponse = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: "test-filler-fields-2",
          formId: formId,
          response: {
            "57734f65-8bbb-4065-9e71-fb7f0b7485f8": {
              label: "Manager",
              value: "John Smith",
            },
            "f4e9fa6c-5c5d-4d8e-b15c-7f37e9d0c729": {
              label: "Rating",
              value: 5,
            },
          },
        },
      });

      // First verify the denormalized records were created
      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUnique({
        where: { id: formResponse.id },
        include: { fields: true },
      });

      expect(denormalizedResponse).not.toBeNull();
      expect(denormalizedResponse?.fields).toBeDefined();
      expect(denormalizedResponse?.fields).toHaveLength(2);

      // Test filtering by string value
      const stringFilterResult = await prisma.routingFormResponseDenormalized.findMany({
        where: {
          fields: {
            some: {
              fieldId: "57734f65-8bbb-4065-9e71-fb7f0b7485f8",
              valueString: "John Smith",
            },
          },
        },
        include: {
          fields: true,
        },
      });

      expect(stringFilterResult).toHaveLength(1);
      expect(stringFilterResult[0].fields).toBeDefined();
      expect(
        stringFilterResult[0].fields.some(
          (field) =>
            field.fieldId === "57734f65-8bbb-4065-9e71-fb7f0b7485f8" && field.valueString === "John Smith"
        )
      ).toBe(true);

      // Test filtering by number value
      const numberFilterResult = await prisma.routingFormResponseDenormalized.findMany({
        where: {
          formId,
          fields: {
            some: {
              fieldId: "f4e9fa6c-5c5d-4d8e-b15c-7f37e9d0c729",
              valueNumber: 5,
            },
          },
        },
        include: {
          fields: true,
        },
      });

      expect(numberFilterResult).toHaveLength(1);
      expect(numberFilterResult[0].fields).toBeDefined();
      expect(
        numberFilterResult[0].fields.some(
          (field) =>
            field.fieldId === "f4e9fa6c-5c5d-4d8e-b15c-7f37e9d0c729" &&
            field.valueNumber?.equals(new Prisma.Decimal(5))
        )
      ).toBe(true);

      // Clean up
      await prisma.routingFormResponseField.deleteMany({
        where: { responseId: formResponse.id },
      });
      await prisma.routingFormResponseDenormalized.deleteMany({
        where: { id: formResponse.id },
      });
      await prisma.app_RoutingForms_FormResponse.delete({
        where: { id: formResponse.id },
      });
    });

    it("should allow filtering by attendee email", async () => {
      // Create a booking with attendees
      const booking = await prisma.booking.create({
        data: {
          uid: `routing-form-response-denorm-${Math.floor(Math.random() * 1000000)}`,
          title: "Test Booking",
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60 * 1000),
          userId: userId,
          eventTypeId: eventTypeId,
          status: BookingStatus.PENDING,
          attendees: {
            create: [
              {
                email: "attendee1@example.com",
                name: "Attendee One",
                timeZone: "UTC",
              },
              {
                email: "attendee2@example.com",
                name: "Attendee Two",
                timeZone: "UTC",
              },
            ],
          },
        },
        include: {
          attendees: true,
        },
      });

      // Create a form response linked to the booking
      const formResponse = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: "test-filler-attendees",
          formId: formId,
          response: {
            "dd28ffcf-7029-401e-bddb-ce2e7496a1c1": {
              label: "Email",
              value: "attendee1@example.com",
            },
          },
          routedToBookingUid: booking.uid,
        },
      });

      // First verify the denormalized records were created
      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUnique({
        where: { id: formResponse.id },
        include: { fields: true },
      });

      expect(denormalizedResponse).not.toBeNull();
      expect(denormalizedResponse?.bookingId).toBe(booking.id);

      // Test filtering by attendee email
      const attendeeFilterResult = await prisma.routingFormResponseDenormalized.findMany({
        where: {
          booking: {
            attendees: {
              some: {
                email: {
                  startsWith: "attendee1@",
                },
              },
            },
          },
        },
        include: {
          fields: true,
          booking: {
            include: {
              attendees: true,
            },
          },
        },
      });

      expect(attendeeFilterResult).toHaveLength(1);
      expect(attendeeFilterResult[0].booking?.attendees).toBeDefined();
      expect(
        attendeeFilterResult[0].booking?.attendees.some(
          (attendee) => attendee.email === "attendee1@example.com"
        )
      ).toBe(true);

      // Clean up
      await prisma.booking.delete({
        where: { id: booking.id },
      });
      await prisma.app_RoutingForms_FormResponse.delete({
        where: { id: formResponse.id },
      });
    });
  });
});
