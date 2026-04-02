import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("RoutingFormResponseField", () => {
  let userId: number;
  let formId: string;
  let eventTypeId: number;
  let bookingId: number;
  let responseId: number;
  const randomId = Math.floor(Math.random() * 1000000);
  const email = `routing-form-response-field-${randomId}@example.com`;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        email,
        username: `routing-form-response-field-testuser-${randomId}`,
        name: "Test User",
      },
    });
    userId = user.id;

    const eventType = await prisma.eventType.create({
      data: {
        title: "Test Event",
        slug: "test-event",
        length: 60,
        userId: user.id,
      },
    });
    eventTypeId = eventType.id;

    const form = await prisma.app_RoutingForms_Form.create({
      data: {
        name: "Test Form",
        userId: user.id,
        fields: [
          {
            id: "text-field-id",
            type: "text",
            label: "Name",
            required: true,
          },
          {
            id: "number-field-id",
            type: "number",
            label: "Rating",
            required: false,
          },
          {
            id: "multiselect-field-id",
            type: "multiselect",
            label: "Skills",
            required: false,
            options: [
              {
                id: "skill-1",
                label: "JavaScript",
              },
              {
                id: "skill-2",
                label: "TypeScript",
              },
              {
                id: "skill-3",
                label: "React",
              },
            ],
          },
          {
            id: "email-field-id",
            type: "email",
            label: "Email",
            required: true,
          },
        ],
      },
    });
    formId = form.id;

    const booking = await prisma.booking.create({
      data: {
        uid: `routing-form-response-field-${randomId}`,
        title: "Test Booking",
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        userId: user.id,
        eventTypeId: eventType.id,
        status: BookingStatus.PENDING,
      },
    });
    bookingId = booking.id;
  });

  afterEach(async () => {
    if (responseId) {
      await prisma.routingFormResponseField.deleteMany({
        where: { responseId },
      });
      await prisma.routingFormResponseDenormalized.deleteMany({
        where: { id: responseId },
      });
      await prisma.app_RoutingForms_FormResponse.deleteMany({
        where: { id: responseId },
      });
    }
    if (bookingId) {
      await prisma.booking.deleteMany({
        where: { id: bookingId },
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

  describe("INSERT Trigger Tests", () => {
    it("should create field entries when form response is created", async () => {
      const formResponse = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: "test-filler-all-fields",
          formId: formId,
          response: {
            "text-field-id": {
              label: "Name",
              value: "John Doe",
            },
            "number-field-id": {
              label: "Rating",
              value: 5,
            },
            "multiselect-field-id": {
              label: "Skills",
              value: ["skill-1", "skill-3"],
            },
            "email-field-id": {
              label: "Email",
              value: "john.doe@example.com",
            },
          },
          routedToBookingUid: null,
        },
      });
      responseId = formResponse.id;

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUnique({
        where: { id: responseId },
        include: { fields: true },
      });

      expect(denormalizedResponse).not.toBeNull();
      expect(denormalizedResponse?.fields).toBeDefined();
      expect(denormalizedResponse?.fields).toHaveLength(4);

      const textField = denormalizedResponse?.fields.find((field) => field.fieldId === "text-field-id");
      expect(textField).toBeDefined();
      expect(textField?.valueString).toBe("John Doe");
      expect(textField?.valueNumber).toBeNull();
      expect(textField?.valueStringArray).toEqual([]);

      const numberField = denormalizedResponse?.fields.find((field) => field.fieldId === "number-field-id");
      expect(numberField).toBeDefined();
      expect(numberField?.valueString).toBeNull();
      expect(numberField?.valueNumber?.equals(new Prisma.Decimal(5))).toBe(true);
      expect(numberField?.valueStringArray).toEqual([]);

      const multiselectField = denormalizedResponse?.fields.find(
        (field) => field.fieldId === "multiselect-field-id"
      );
      expect(multiselectField).toBeDefined();
      expect(multiselectField?.valueString).toBeNull();
      expect(multiselectField?.valueNumber).toBeNull();
      expect(multiselectField?.valueStringArray).toContain("skill-1");
      expect(multiselectField?.valueStringArray).toContain("skill-3");
      expect(multiselectField?.valueStringArray).toHaveLength(2);

      const emailField = denormalizedResponse?.fields.find((field) => field.fieldId === "email-field-id");
      expect(emailField).toBeDefined();
      expect(emailField?.valueString).toBe("john.doe@example.com");
      expect(emailField?.valueNumber).toBeNull();
      expect(emailField?.valueStringArray).toEqual([]);
    });

    it("should handle null and undefined field values", async () => {
      const formResponse = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: "test-filler-null-values",
          formId: formId,
          response: {
            "text-field-id": {
              label: "Name",
              value: null,
            },
            "number-field-id": {
              label: "Rating",
              value: undefined,
            },
            "multiselect-field-id": {
              label: "Skills",
              value: [],
            },
            "email-field-id": {
              label: "Email",
              value: "",
            },
          },
          routedToBookingUid: null,
        },
      });
      responseId = formResponse.id;

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUnique({
        where: { id: responseId },
        include: { fields: true },
      });

      expect(denormalizedResponse).not.toBeNull();
      expect(denormalizedResponse?.fields).toBeDefined();
      expect(denormalizedResponse?.fields.length).toBeLessThanOrEqual(2);

      const emailField = denormalizedResponse?.fields.find((field) => field.fieldId === "email-field-id");
      if (emailField) {
        expect(emailField.valueString).toBe("");
      }

      const multiselectField = denormalizedResponse?.fields.find(
        (field) => field.fieldId === "multiselect-field-id"
      );
      if (multiselectField) {
        expect(multiselectField.valueStringArray).toEqual([]);
      }
    });

    it("should handle invalid data types", async () => {
      const formResponse = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: "test-filler-invalid-types",
          formId: formId,
          response: {
            "text-field-id": {
              label: "Name",
              value: 123, // Number instead of string
            },
            "number-field-id": {
              label: "Rating",
              value: "five", // String instead of number
            },
            "multiselect-field-id": {
              label: "Skills",
              value: "skill-1", // String instead of array
            },
          },
          routedToBookingUid: null,
        },
      });
      responseId = formResponse.id;

      const denormalizedResponse = await prisma.routingFormResponseDenormalized.findUnique({
        where: { id: responseId },
        include: { fields: true },
      });

      expect(denormalizedResponse).not.toBeNull();
      expect(denormalizedResponse?.fields).toBeDefined();
    });
  });

  describe("UPDATE Trigger Tests", () => {
    it("should update field entries when form response is updated", async () => {
      const formResponse = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: "test-filler-update",
          formId: formId,
          response: {
            "text-field-id": {
              label: "Name",
              value: "Original Name",
            },
            "number-field-id": {
              label: "Rating",
              value: 3,
            },
            "multiselect-field-id": {
              label: "Skills",
              value: ["skill-1"],
            },
          },
          routedToBookingUid: null,
        },
      });
      responseId = formResponse.id;

      const initialDenormalizedResponse = await prisma.routingFormResponseDenormalized.findUnique({
        where: { id: responseId },
        include: { fields: true },
      });

      expect(initialDenormalizedResponse).not.toBeNull();
      expect(initialDenormalizedResponse?.fields).toBeDefined();
      expect(initialDenormalizedResponse?.fields).toHaveLength(3);

      const initialTextField = initialDenormalizedResponse?.fields.find(
        (field) => field.fieldId === "text-field-id"
      );
      expect(initialTextField?.valueString).toBe("Original Name");

      await prisma.app_RoutingForms_FormResponse.update({
        where: { id: responseId },
        data: {
          response: {
            "text-field-id": {
              label: "Name",
              value: "Updated Name",
            },
            "number-field-id": {
              label: "Rating",
              value: 5,
            },
            "multiselect-field-id": {
              label: "Skills",
              value: ["skill-1", "skill-2"],
            },
            "email-field-id": {
              label: "Email",
              value: "new@example.com",
            },
          },
        },
      });

      const updatedDenormalizedResponse = await prisma.routingFormResponseDenormalized.findUnique({
        where: { id: responseId },
        include: { fields: true },
      });

      expect(updatedDenormalizedResponse).not.toBeNull();
      expect(updatedDenormalizedResponse?.fields).toBeDefined();
      expect(updatedDenormalizedResponse?.fields).toHaveLength(4); // Now we have 4 fields

      const updatedTextField = updatedDenormalizedResponse?.fields.find(
        (field) => field.fieldId === "text-field-id"
      );
      expect(updatedTextField).toBeDefined();
      expect(updatedTextField?.valueString).toBe("Updated Name");

      const updatedNumberField = updatedDenormalizedResponse?.fields.find(
        (field) => field.fieldId === "number-field-id"
      );
      expect(updatedNumberField).toBeDefined();
      expect(updatedNumberField?.valueNumber?.equals(new Prisma.Decimal(5))).toBe(true);

      const updatedMultiselectField = updatedDenormalizedResponse?.fields.find(
        (field) => field.fieldId === "multiselect-field-id"
      );
      expect(updatedMultiselectField).toBeDefined();
      expect(updatedMultiselectField?.valueStringArray).toContain("skill-1");
      expect(updatedMultiselectField?.valueStringArray).toContain("skill-2");
      expect(updatedMultiselectField?.valueStringArray).toHaveLength(2);

      const newEmailField = updatedDenormalizedResponse?.fields.find(
        (field) => field.fieldId === "email-field-id"
      );
      expect(newEmailField).toBeDefined();
      expect(newEmailField?.valueString).toBe("new@example.com");
    });

    it("should remove field entries when fields are removed from response", async () => {
      const formResponse = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: "test-filler-remove-fields",
          formId: formId,
          response: {
            "text-field-id": {
              label: "Name",
              value: "Test Name",
            },
            "number-field-id": {
              label: "Rating",
              value: 4,
            },
            "multiselect-field-id": {
              label: "Skills",
              value: ["skill-1", "skill-2"],
            },
            "email-field-id": {
              label: "Email",
              value: "test@example.com",
            },
          },
          routedToBookingUid: null,
        },
      });
      responseId = formResponse.id;

      const initialDenormalizedResponse = await prisma.routingFormResponseDenormalized.findUnique({
        where: { id: responseId },
        include: { fields: true },
      });

      expect(initialDenormalizedResponse).not.toBeNull();
      expect(initialDenormalizedResponse?.fields).toBeDefined();
      expect(initialDenormalizedResponse?.fields).toHaveLength(4);

      await prisma.app_RoutingForms_FormResponse.update({
        where: { id: responseId },
        data: {
          response: {
            "text-field-id": {
              label: "Name",
              value: "Test Name",
            },
            "email-field-id": {
              label: "Email",
              value: "test@example.com",
            },
          },
        },
      });

      const updatedDenormalizedResponse = await prisma.routingFormResponseDenormalized.findUnique({
        where: { id: responseId },
        include: { fields: true },
      });

      expect(updatedDenormalizedResponse).not.toBeNull();
      expect(updatedDenormalizedResponse?.fields).toBeDefined();
      expect(updatedDenormalizedResponse?.fields).toHaveLength(2); // Now we have only 2 fields

      const fieldIds = updatedDenormalizedResponse?.fields.map((field) => field.fieldId);
      expect(fieldIds).toContain("text-field-id");
      expect(fieldIds).toContain("email-field-id");
      expect(fieldIds).not.toContain("number-field-id");
      expect(fieldIds).not.toContain("multiselect-field-id");
    });
  });
});
