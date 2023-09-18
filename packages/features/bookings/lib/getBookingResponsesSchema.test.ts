/* eslint-disable playwright/no-conditional-in-test */
import { describe, expect } from "vitest";
import type { z } from "zod";

import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import { test } from "@calcom/web/test/fixtures/fixtures";

import getBookingResponsesSchema from "./getBookingResponsesSchema";

const CUSTOM_REQUIRED_FIELD_ERROR_MSG = "error_required_field";
const CUSTOM_PHONE_VALIDATION_ERROR_MSG = "invalid_number";
const CUSTOM_EMAIL_VALIDATION_ERROR_MSG = "email_validation_error";
const ZOD_REQUIRED_FIELD_ERROR_MSG = "Required";
test(`should parse booking responses`, async ({}) => {
  const schema = getBookingResponsesSchema({
    eventType: {
      bookingFields: [
        {
          name: "name",
          type: "name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          required: true,
        },
        {
          name: "testField",
          type: "text",
          required: true,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
    },
    view: "ALL_VIEWS",
  });
  const parsedResponses = await schema.parseAsync({
    testField: "test",
    email: "test@test.com",
    name: "test",
  });
  expect(parsedResponses).toEqual(
    expect.objectContaining({
      testField: "test",
      email: "test@test.com",
      name: "test",
    })
  );
});
describe("getBookingResponsesSchema", () => {
  test(`should error if required fields are missing`, async ({}) => {
    const schema = getBookingResponsesSchema({
      eventType: {
        bookingFields: [
          {
            name: "name",
            type: "name",
            required: true,
          },
          {
            name: "email",
            type: "email",
            required: true,
          },
          {
            name: "testField",
            type: "text",
            required: true,
          },
        ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      },
      view: "ALL_VIEWS",
    });
    const parsedResponses = await schema.safeParseAsync({
      email: "test@test.com",
      name: "test",
    });
    expect(parsedResponses.success).toBe(false);
    if (!parsedResponses.success) {
      expect(parsedResponses.error.issues[0]).toEqual(
        expect.objectContaining({
          code: "custom",
          message: `{testField}${CUSTOM_REQUIRED_FIELD_ERROR_MSG}`,
        })
      );
    }
  });
  describe("System Fields", () => {
    describe(`'name' and 'email' must be considered as required fields`, () => {
      test(`'name' and 'email' must be considered as required fields `, async ({}) => {
        const schema = getBookingResponsesSchema({
          eventType: {
            bookingFields: [
              {
                name: "name",
                type: "name",
                required: true,
              },
              {
                name: "email",
                type: "email",
                required: true,
              },
              {
                name: "testField",
                type: "text",
                required: false,
              },
            ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
          },
          view: "ALL_VIEWS",
        });
        const parsedResponsesWithJustName = await schema.safeParseAsync({
          name: "John",
        });
        expect(parsedResponsesWithJustName.success).toBe(false);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        expect(parsedResponsesWithJustName.error.issues[0]).toEqual(
          expect.objectContaining({
            message: ZOD_REQUIRED_FIELD_ERROR_MSG,
            path: ["email"],
          })
        );

        const parsedResponsesWithJustEmail = await schema.safeParseAsync({
          email: "john@example.com",
        });

        expect(parsedResponsesWithJustEmail.success).toBe(false);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        expect(parsedResponsesWithJustEmail.error.issues[0]).toEqual(
          expect.objectContaining({
            message: "Invalid input",
            path: ["name"],
          })
        );
      });
      test(`'email' must be validated `, async () => {
        const schema = getBookingResponsesSchema({
          eventType: {
            bookingFields: [
              {
                name: "name",
                type: "name",
                required: true,
              },
              {
                name: "email",
                type: "email",
                required: true,
              },
              {
                name: "testField",
                type: "text",
                required: false,
              },
            ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
          },
          view: "ALL_VIEWS",
        });
        const parsedResponses = await schema.safeParseAsync({
          name: "John",
          email: "john",
        });
        expect(parsedResponses.success).toBe(false);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(parsedResponses.error.issues[0]).toEqual(
          expect.objectContaining({
            // We don't get zod default email address validation error because `bookingResponses` schema defines email as z.string() only
            // So, the error comes from superRefine in getBookingResponsesSchema. We should change this to zod email validation error
            message: `{email}${CUSTOM_EMAIL_VALIDATION_ERROR_MSG}`,
            code: "custom",
          })
        );
      });
      test(`firstName is required and lastName is optional by default`, async () => {
        const schema = getBookingResponsesSchema({
          eventType: {
            bookingFields: [
              {
                name: "name",
                type: "name",
                required: true,
                variant: "firstAndLastName",
              },
              {
                name: "email",
                type: "email",
                required: true,
              },
              {
                name: "testField",
                type: "text",
                required: false,
              },
            ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
          },
          view: "ALL_VIEWS",
        });
        const parsedResponses = await schema.safeParseAsync({
          name: {
            firstName: "John",
          },
          email: "john@example.com",
        });
        expect(parsedResponses.success).toBe(true);
        // eslint-disable-next-line playwright/no-conditional-in-test
        if (!parsedResponses.success) {
          throw new Error("Should not reach here");
        }
        expect(parsedResponses.data).toEqual({
          name: {
            firstName: "John",
          },
          email: "john@example.com",
        });
      });
      describe(`'name' can be transformed from one variant to other `, () => {
        test("`firstAndLastName` variant to `fullName`", async () => {
          const schema = getBookingResponsesSchema({
            eventType: {
              bookingFields: [
                {
                  name: "name",
                  type: "name",
                  required: true,
                },
                {
                  name: "email",
                  type: "email",
                  required: true,
                },
                {
                  name: "testField",
                  type: "text",
                  required: false,
                },
              ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
            },
            view: "ALL_VIEWS",
          });
          const parsedResponses = await schema.safeParseAsync({
            name: {
              firstName: "John",
              lastName: "Doe",
            },
            email: "john@example.com",
          });

          expect(parsedResponses.success).toBe(true);
          // eslint-disable-next-line playwright/no-conditional-in-test
          if (!parsedResponses.success) {
            throw new Error("Should not reach here");
          }
          expect(parsedResponses.data).toEqual(
            expect.objectContaining({
              name: "John Doe",
              email: "john@example.com",
            })
          );
        });

        test("`fullName` to `firstAndLastName` when there is a lastName(separated by space)", async () => {
          const schema = getBookingResponsesSchema({
            eventType: {
              bookingFields: [
                {
                  name: "name",
                  type: "name",
                  required: true,
                  variant: "firstAndLastName",
                },
                {
                  name: "email",
                  type: "email",
                  required: true,
                },
                {
                  name: "testField",
                  type: "text",
                  required: false,
                },
              ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
            },
            view: "ALL_VIEWS",
          });
          const parsedResponses = await schema.safeParseAsync({
            name: "John Doe",
            email: "john@example.com",
          });

          expect(parsedResponses.success).toBe(true);
          // eslint-disable-next-line playwright/no-conditional-in-test
          if (!parsedResponses.success) {
            throw new Error("Should not reach here");
          }
          expect(parsedResponses.data).toEqual(
            expect.objectContaining({
              name: {
                firstName: "John",
                lastName: "Doe",
              },
              email: "john@example.com",
            })
          );
        });
        test("`fullName` to `firstAndLastName` when there is no lastName(separated by space)", async () => {
          const schema = getBookingResponsesSchema({
            eventType: {
              bookingFields: [
                {
                  name: "name",
                  type: "name",
                  required: true,
                  variant: "firstAndLastName",
                },
                {
                  name: "email",
                  type: "email",
                  required: true,
                },
                {
                  name: "testField",
                  type: "text",
                  required: false,
                },
              ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
            },
            view: "ALL_VIEWS",
          });
          const parsedResponses = await schema.safeParseAsync({
            name: "John",
            email: "john@example.com",
          });

          expect(parsedResponses.success).toBe(true);
          // eslint-disable-next-line playwright/no-conditional-in-test
          if (!parsedResponses.success) {
            throw new Error("Should not reach here");
          }
          expect(parsedResponses.data).toEqual(
            expect.objectContaining({
              name: {
                firstName: "John",
                lastName: "",
              },
              email: "john@example.com",
            })
          );
        });
      });
    });
  });

  describe("validate phone type field", () => {
    test(`should fail parsing if invalid phone provided`, async ({}) => {
      const schema = getBookingResponsesSchema({
        eventType: {
          bookingFields: [
            {
              name: "name",
              type: "name",
              required: true,
            },
            {
              name: "email",
              type: "email",
              required: true,
            },
            {
              name: "testPhone",
              type: "phone",
              required: true,
            },
          ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
        },
        view: "ALL_VIEWS",
      });
      const parsedResponses = await schema.safeParseAsync({
        email: "test@test.com",
        name: "test",
        testPhone: "1234567890",
      });
      expect(parsedResponses.success).toBe(false);
      if (parsedResponses.success) {
        throw new Error("Should not reach here");
      }
      expect(parsedResponses.error.issues[0]).toEqual(
        expect.objectContaining({
          code: "custom",
          message: `{testPhone}${CUSTOM_PHONE_VALIDATION_ERROR_MSG}`,
        })
      );
    });
    test(`should succesfull give responses if phone type field value is valid`, async ({}) => {
      const schema = getBookingResponsesSchema({
        eventType: {
          bookingFields: [
            {
              name: "name",
              type: "name",
              required: true,
            },
            {
              name: "email",
              type: "email",
              required: true,
            },
            {
              name: "testPhone",
              type: "phone",
              required: true,
            },
          ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
        },
        view: "ALL_VIEWS",
      });
      const parsedResponses = await schema.safeParseAsync({
        email: "test@test.com",
        name: "test",
        testPhone: "+919999999999",
      });
      expect(parsedResponses.success).toBe(true);
      if (!parsedResponses.success) {
        throw new Error("Should not reach here");
      }
      expect(parsedResponses.data).toEqual({
        email: "test@test.com",
        name: "test",
        testPhone: "+919999999999",
      });
    });

    test("should fail parsing if phone field value is empty", async ({}) => {
      const schema = getBookingResponsesSchema({
        eventType: {
          bookingFields: [
            {
              name: "name",
              type: "name",
              required: true,
            },
            {
              name: "email",
              type: "email",
              required: true,
            },
            {
              name: "testPhone",
              type: "phone",
              required: true,
            },
          ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
        },
        view: "ALL_VIEWS",
      });
      const parsedResponses = await schema.safeParseAsync({
        email: "test@test.com",
        name: "test",
        testPhone: "",
      });
      expect(parsedResponses.success).toBe(false);
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (parsedResponses.success) {
        throw new Error("Should not reach here");
      }
      expect(parsedResponses.error.issues[0]).toEqual(
        expect.objectContaining({
          code: "custom",
          message: `{testPhone}${CUSTOM_REQUIRED_FIELD_ERROR_MSG}`,
        })
      );
    });

    test("should fail parsing if phone field value isn't provided", async ({}) => {
      const schema = getBookingResponsesSchema({
        eventType: {
          bookingFields: [
            {
              name: "name",
              type: "name",
              required: true,
            },
            {
              name: "email",
              type: "email",
              required: true,
            },
            {
              name: "testPhone",
              type: "phone",
              required: true,
            },
          ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
        },
        view: "ALL_VIEWS",
      });
      const parsedResponses = await schema.safeParseAsync({
        email: "test@test.com",
        name: "test",
      });
      expect(parsedResponses.success).toBe(false);
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (parsedResponses.success) {
        throw new Error("Should not reach here");
      }
      expect(parsedResponses.error.issues[0]).toEqual(
        expect.objectContaining({
          code: "custom",
          message: `{testPhone}${CUSTOM_REQUIRED_FIELD_ERROR_MSG}`,
        })
      );
    });
  });

  test("should fail parsing when invalid field type is provided", async () => {
    const schema = getBookingResponsesSchema({
      eventType: {
        bookingFields: [
          {
            name: "name",
            type: "name",
            required: true,
          },
          {
            name: "email",
            type: "email",
            required: true,
          },
          {
            name: "invalidField",
            type: "unknown-field-type",
            required: true,
          },
        ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      },
      view: "ALL_VIEWS",
    });
    const parsedResponses = await schema.safeParseAsync({
      email: "test@test.com",
      name: "test",
      invalidField: "1234567890",
    });
    expect(parsedResponses.success).toBe(false);
    if (parsedResponses.success) {
      throw new Error("Should not reach here");
    }
    expect(parsedResponses.error.issues[0]).toEqual(
      expect.objectContaining({
        code: "custom",
        message: `Can't parse unknown booking field type: unknown-field-type`,
      })
    );
  });

  describe("multiemail field type", () => {
    test("should succesfully parse a multiemail type field", async () => {
      const schema = getBookingResponsesSchema({
        eventType: {
          bookingFields: [
            {
              name: "name",
              type: "name",
              required: true,
            },
            {
              name: "email",
              type: "email",
              required: true,
            },
            {
              name: "testEmailsList",
              type: "multiemail",
              required: true,
            },
          ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
        },
        view: "ALL_VIEWS",
      });
      const parsedResponses = await schema.safeParseAsync({
        email: "test@test.com",
        name: "test",
        testEmailsList: ["first@example.com"],
      });
      expect(parsedResponses.success).toBe(true);
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (!parsedResponses.success) {
        throw new Error("Should not reach here");
      }
      expect(parsedResponses.data).toEqual({
        email: "test@test.com",
        name: "test",
        testEmailsList: ["first@example.com"],
      });
    });
    test("should fail parsing when one of the emails is invalid", async () => {
      const schema = getBookingResponsesSchema({
        eventType: {
          bookingFields: [
            {
              name: "name",
              type: "name",
              required: true,
            },
            {
              name: "email",
              type: "email",
              required: true,
            },
            {
              name: "testEmailsList",
              type: "multiemail",
              required: true,
            },
          ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
        },
        view: "ALL_VIEWS",
      });
      const parsedResponses = await schema.safeParseAsync({
        email: "test@test.com",
        name: "test",
        testEmailsList: ["first@example.com", "invalid@example"],
      });
      expect(parsedResponses.success).toBe(false);
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (parsedResponses.success) {
        throw new Error("Should not reach here");
      }
      expect(parsedResponses.error.issues[0]).toEqual(
        expect.objectContaining({
          code: "custom",
          message: `{testEmailsList}${CUSTOM_EMAIL_VALIDATION_ERROR_MSG}`,
        })
      );
    });
    test("should succesfully parse a multiemail type field response, even when the value is just a string[Prefill needs it]", async () => {
      const schema = getBookingResponsesSchema({
        eventType: {
          bookingFields: [
            {
              name: "name",
              type: "name",
              required: true,
            },
            {
              name: "email",
              type: "email",
              required: true,
            },
            {
              name: "testEmailsList",
              type: "multiemail",
              required: true,
            },
          ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
        },
        view: "ALL_VIEWS",
      });
      const parsedResponses = await schema.safeParseAsync({
        email: "test@test.com",
        name: "test",
        testEmailsList: "first@example.com",
      });
      expect(parsedResponses.success).toBe(true);
      if (!parsedResponses.success) {
        throw new Error("Should not reach here");
      }
      expect(parsedResponses.data).toEqual({
        email: "test@test.com",
        name: "test",
        testEmailsList: ["first@example.com"],
      });
    });
  });
});
