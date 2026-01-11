/* eslint-disable playwright/no-conditional-in-test */
import { describe, expect } from "vitest";
import type { z } from "zod";

import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import { test } from "@calcom/web/test/fixtures/fixtures";

import getBookingResponsesSchema, { getBookingResponsesPartialSchema } from "./getBookingResponsesSchema";

const CUSTOM_REQUIRED_FIELD_ERROR_MSG = "error_required_field";
const CUSTOM_PHONE_VALIDATION_ERROR_MSG = "invalid_number";
const CUSTOM_EMAIL_VALIDATION_ERROR_MSG = "email_validation_error";
const CUSTOM_URL_VALIDATION_ERROR_MSG = "url_validation_error";
const CUSTOM_EMAIL_EXCLUDED_ERROR_MSG = "exclude_emails_match_found_error_message";
const CUSTOM_EMAIL_REQUIRED_ERROR_MSG = "require_emails_no_match_found_error_message";
const ZOD_REQUIRED_FIELD_ERROR_MSG = "Required";

describe("getBookingResponsesSchema", () => {
  test(`should parse booking responses`, async ({}) => {
    const schema = getBookingResponsesSchema({
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

  test(`should error if required fields are missing`, async ({}) => {
    const schema = getBookingResponsesSchema({
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
            path: ["email"],
            message: ZOD_REQUIRED_FIELD_ERROR_MSG,
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

      test(`hidden required email field should not be validated`, async () => {
        const schema = getBookingResponsesSchema({
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
              hidden: true,
            },
            {
              name: "attendeePhoneNumber",
              type: "phone",
              required: true,
            },
          ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
          view: "ALL_VIEWS",
        });
        const parsedResponses = await schema.safeParseAsync({
          name: "John",
          email: "",
          attendeePhoneNumber: "+919999999999",
        });
        expect(parsedResponses.success).toBe(true);
      });

      test(`hidden required phone field should not be validated`, async () => {
        const schema = getBookingResponsesSchema({
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
              name: "attendeePhoneNumber",
              type: "phone",
              required: true,
              hidden: true,
            },
          ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
          view: "ALL_VIEWS",
        });
        const parsedResponses = await schema.safeParseAsync({
          name: "John",
          email: "john@example.com",
          attendeePhoneNumber: "",
        });
        expect(parsedResponses.success).toBe(true);
      });

      test(`firstName is required and lastName is optional by default`, async () => {
        const schema = getBookingResponsesSchema({
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

      test(`should reject empty fullname`, async ({}) => {
        const schema = getBookingResponsesSchema({
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
          view: "ALL_VIEWS",
        });
        const parsedResponses = await schema.safeParseAsync({
          testField: "test",
          email: "test@test.com",
          name: "",
        });

        expect(parsedResponses.success).toBe(false);
        // eslint-disable-next-line playwright/no-conditional-in-test
        if (parsedResponses.success) {
          throw new Error("Should not reach here");
        }
        expect(parsedResponses.error.issues[0]).toEqual(
          expect.objectContaining({
            code: "custom",
            message: `{name}${CUSTOM_REQUIRED_FIELD_ERROR_MSG}`,
          })
        );
      });

      test(`should reject empty firstName`, async ({}) => {
        const schema = getBookingResponsesSchema({
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
              required: true,
            },
          ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
          view: "ALL_VIEWS",
        });
        const parsedResponses = await schema.safeParseAsync({
          testField: "test",
          email: "test@test.com",
          name: {
            firstName: "  ",
            lastName: "Doe",
          },
        });

        if (parsedResponses.success) {
          throw new Error("Should not reach here");
        }
        expect(parsedResponses.error.issues[0]).toEqual(
          expect.objectContaining({
            code: "custom",
            message: `{name}Invalid string`,
          })
        );
      });

      test(`should accept empty lastname`, async ({}) => {
        const schema = getBookingResponsesSchema({
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
              required: true,
            },
          ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
          view: "ALL_VIEWS",
        });
        const parsedResponses = await schema.parseAsync({
          testField: "test",
          email: "test@test.com",
          name: {
            firstName: "John",
            lastName: "",
          },
        });

        expect(parsedResponses).toEqual({
          testField: "test",
          email: "test@test.com",
          name: {
            firstName: "John",
            lastName: "",
          },
        });
      });

      describe(`'name' can be transformed from one variant to other `, () => {
        test("`firstAndLastName` variant to `fullName`", async () => {
          const schema = getBookingResponsesSchema({
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
    test(`should successfully give responses if phone type field value is valid`, async ({}) => {
      const schema = getBookingResponsesSchema({
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

    test(`should give parsed response if phone type field value starts with a space`, async ({}) => {
      const schema = getBookingResponsesSchema({
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
        view: "ALL_VIEWS",
      });
      const parsedResponses = await schema.safeParseAsync({
        email: "test@test.com",
        name: "test",
        // Space can come due to libraries considering + to be space
        testPhone: " 919999999999",
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

      const parsedResponses2 = await schema.safeParseAsync({
        email: "test@test.com",
        name: "test",
        // Space can come due to libraries considering + to be space
        testPhone: "     919999999999",
      });
      expect(parsedResponses2.success).toBe(true);
      if (!parsedResponses2.success) {
        throw new Error("Should not reach here");
      }
      expect(parsedResponses2.data).toEqual({
        email: "test@test.com",
        name: "test",
        testPhone: "+919999999999",
      });
    });

    test("should fail parsing if phone field value is empty", async ({}) => {
      const schema = getBookingResponsesSchema({
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
    test("should successfully parse a multiemail type field", async () => {
      const schema = getBookingResponsesSchema({
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

    test("should successfully parse a multiemail type field response, even when the value is just a string[Prefill needs it]", async () => {
      const schema = getBookingResponsesSchema({
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

  describe("multiselect field type", () => {
    test("should successfully parse a multiselect type field", async () => {
      const schema = getBookingResponsesSchema({
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
            name: "testMultiselect",
            type: "multiselect",
            required: true,
          },
        ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
        view: "ALL_VIEWS",
      });
      const parsedResponses = await schema.safeParseAsync({
        email: "test@test.com",
        name: "test",
        testMultiselect: ["option1", "option-2"],
      });
      expect(parsedResponses.success).toBe(true);
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (!parsedResponses.success) {
        throw new Error("Should not reach here");
      }
      expect(parsedResponses.data).toEqual({
        email: "test@test.com",
        name: "test",
        testMultiselect: ["option1", "option-2"],
      });
    });
    test("should successfully parse a multiselect type field", async () => {
      const schema = getBookingResponsesSchema({
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
            name: "testMultiselect",
            type: "multiselect",
            required: true,
          },
        ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
        view: "ALL_VIEWS",
      });
      const parsedResponses = await schema.safeParseAsync({
        email: "test@test.com",
        name: "test",
        testMultiselect: "option1",
      });
      expect(parsedResponses.success).toBe(true);
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (!parsedResponses.success) {
        throw new Error("Should not reach here");
      }
      expect(parsedResponses.data).toEqual({
        email: "test@test.com",
        name: "test",
        testMultiselect: ["option1"],
      });
    });
    test("should fail parsing if selected options aren't strings", async () => {
      const schema = getBookingResponsesSchema({
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
            name: "testMultiselect",
            type: "multiselect",
            required: true,
          },
        ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
        view: "ALL_VIEWS",
      });
      const parsedResponses = await schema.safeParseAsync({
        email: "test@test.com",
        name: "test",
        testMultiselect: [1, 2],
      });
      expect(parsedResponses.success).toBe(false);

      // eslint-disable-next-line playwright/no-conditional-in-test
      if (parsedResponses.success) {
        throw new Error("Should not reach here");
      }

      expect(parsedResponses.error.issues[0]).toEqual(
        expect.objectContaining({
          code: "custom",
          message: `{testMultiselect}Invalid array of strings`,
        })
      );
    });
  });

  describe("multiselect field type", () => {
    test("should successfully parse a multiselect type field", async () => {
      const schema = getBookingResponsesSchema({
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
            name: "testMultiselect",
            type: "multiselect",
            required: true,
          },
        ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
        view: "ALL_VIEWS",
      });
      const parsedResponses = await schema.safeParseAsync({
        email: "test@test.com",
        name: "test",
        testMultiselect: ["option1", "option-2"],
      });
      expect(parsedResponses.success).toBe(true);
      // eslint-disable-next-line playwright/no-conditional-in-test
      if (!parsedResponses.success) {
        throw new Error("Should not reach here");
      }
      expect(parsedResponses.data).toEqual({
        email: "test@test.com",
        name: "test",
        testMultiselect: ["option1", "option-2"],
      });
    });
  });

  test.todo("select");
  test.todo("textarea");
  test.todo("number");
  test.todo("checkbox");
  test.todo("radio");
  test.todo("boolean");
});

describe("validate radioInput type field", () => {
  test(`should fail parsing if invalid phone number is provided`, async ({}) => {
    const schema = getBookingResponsesSchema({
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
          name: "radioInput",
          type: "radioInput",
          required: true,
          optionsInputs: {
            phone: {
              type: "phone",
            },
          },
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });
    const parsedResponses = await schema.safeParseAsync({
      email: "test@test.com",
      name: "test",
      radioInput: JSON.stringify({
        value: "phone",
        optionValue: " 9999999999",
      }),
    });
    expect(parsedResponses.success).toBe(false);
    if (parsedResponses.success) {
      throw new Error("Should not reach here");
    }
    expect(parsedResponses.error.issues[0]).toEqual(
      expect.objectContaining({
        code: "custom",
        message: `{radioInput}${CUSTOM_PHONE_VALIDATION_ERROR_MSG}`,
      })
    );
  });

  test(`should correctly handle space in the beginning of phone number which could come from a + in prefill URL`, async ({}) => {
    const schema = getBookingResponsesSchema({
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
          name: "radioInput",
          type: "radioInput",
          required: true,
          optionsInputs: {
            // A field of type phone
            randomField: {
              type: "phone",
            },
          },
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });
    const parsedResponses = await schema.safeParseAsync({
      email: "test@test.com",
      name: "test",
      radioInput: JSON.stringify({
        value: "randomField",
        optionValue: " 919999999999",
      }),
    });
    expect(parsedResponses.success).toBe(true);
    if (!parsedResponses.success) {
      throw new Error("Should not reach here");
    }
    expect(parsedResponses.data).toEqual({
      email: "test@test.com",
      name: "test",
      radioInput: {
        value: "randomField",
        optionValue: "+919999999999",
      },
    });
  });
});

describe("validate url type field", () => {
  test(`should pass parsing if protocol is missing`, async ({}) => {
    const schema = getBookingResponsesSchema({
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
          name: "url",
          type: "url",
          required: true,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });
    const parsedResponses = await schema.safeParseAsync({
      email: "test@test.com",
      name: "test",
      url: "www.example.com",
    });
    // Expect success because our logic now handles missing protocol
    expect(parsedResponses.success).toBe(true);
    if (!parsedResponses.success) {
      throw new Error("Should not reach here");
    }
    expect(parsedResponses.data).toEqual({
      email: "test@test.com",
      name: "test",
      url: "www.example.com",
    });
  });

  test(`should fail parsing if url is truly invalid`, async ({}) => {
    const schema = getBookingResponsesSchema({
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
          name: "url",
          type: "url",
          required: true,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });
    const parsedResponses = await schema.safeParseAsync({
      email: "test@test.com",
      name: "test",
      url: "http:/nope",
    });
    expect(parsedResponses.success).toBe(false);
    if (parsedResponses.success) {
      throw new Error("Should not reach here");
    }
    expect(parsedResponses.error.issues[0]).toEqual(
      expect.objectContaining({
        code: "custom",
        message: `{url}${CUSTOM_URL_VALIDATION_ERROR_MSG}`,
      })
    );
  });

  test(`should successfully give responses if url type field value is valid`, async ({}) => {
    const schema = getBookingResponsesSchema({
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
          name: "url",
          type: "url",
          required: true,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });
    const parsedResponses = await schema.safeParseAsync({
      email: "test@test.com",
      name: "test",
      url: "https://8x8.vc/company",
    });
    expect(parsedResponses.success).toBe(true);
    if (!parsedResponses.success) {
      throw new Error("Should not reach here");
    }
    expect(parsedResponses.data).toEqual({
      email: "test@test.com",
      name: "test",
      url: "https://8x8.vc/company",
    });
  });

  test("should fail parsing if url field value is empty", async ({}) => {
    const schema = getBookingResponsesSchema({
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
          name: "url",
          type: "url",
          required: true,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });
    const parsedResponses = await schema.safeParseAsync({
      email: "test@test.com",
      name: "test",
      url: "",
    });
    expect(parsedResponses.success).toBe(false);
    // eslint-disable-next-line playwright/no-conditional-in-test
    if (parsedResponses.success) {
      throw new Error("Should not reach here");
    }
    expect(parsedResponses.error.issues[0]).toEqual(
      expect.objectContaining({
        code: "custom",
        message: `{url}${CUSTOM_REQUIRED_FIELD_ERROR_MSG}`,
      })
    );
  });
});

describe("getBookingResponsesPartialSchema - Prefill validation", () => {
  test(`should be able to get fields prefilled even when name is empty string`, async ({}) => {
    const schema = getBookingResponsesPartialSchema({
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
      view: "ALL_VIEWS",
    });
    const parsedResponses = await schema.parseAsync({
      name: "",
      testField: "test",
    });
    expect(parsedResponses).toEqual(
      expect.objectContaining({
        name: "",
        testField: "test",
      })
    );
  });
});

describe("excluded email/domain validation", () => {
  test("should fail if the email is present in excluded emails", async () => {
    const excludedEmails = "spammer@cal.com, hotmail.com, yahoo, @gmail.com";

    const schema = getBookingResponsesSchema({
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
          excludeEmails: excludedEmails,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    const parsedResponses = await schema.safeParseAsync({
      name: "test",
      email: "harry@gmail.com",
    });
    expect(parsedResponses.success).toBe(false);

    if (parsedResponses.success) {
      throw new Error("Should not reach here");
    }
    expect(parsedResponses.error.issues[0]).toEqual(
      expect.objectContaining({
        code: "custom",
        message: `{email}${CUSTOM_EMAIL_EXCLUDED_ERROR_MSG}`,
      })
    );
  });

  test("should pass if the email is not present in excluded emails", async () => {
    const excludedEmails = "spammer@cal.com, hotmail.com, yahoo, @gmail.com";

    const schema = getBookingResponsesSchema({
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
          excludeEmails: excludedEmails,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    const parsedResponses = await schema.safeParseAsync({
      name: "test",
      email: "harry@workmail.com",
    });

    expect(parsedResponses.success).toBe(true);

    if (!parsedResponses.success) {
      throw new Error("Should not reach here");
    }

    expect(parsedResponses.data).toEqual({
      name: "test",
      email: "harry@workmail.com",
    });
  });
});

describe("require email/domain validation", () => {
  test("should fail if the required email/domain is not present", async () => {
    const requiredEmails = "gmail.com, user@hotmail.com, @yahoo.com";
    const schema = getBookingResponsesSchema({
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
          requireEmails: requiredEmails,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    const parsedResponses = await schema.safeParseAsync({
      name: "test",
      email: "test@test.com",
    });

    expect(parsedResponses.success).toBe(false);

    if (parsedResponses.success) {
      throw new Error("Should not reach here");
    }

    expect(parsedResponses.error.issues[0]).toEqual(
      expect.objectContaining({
        code: "custom",
        message: `{email}${CUSTOM_EMAIL_REQUIRED_ERROR_MSG}`,
      })
    );
  });

  test("should pass if the required email/domain is present", async () => {
    const requiredEmails = "gmail.com, user@hotmail.com, @yahoo.com";

    const schema = getBookingResponsesSchema({
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
          requireEmails: requiredEmails,
        },
      ] as z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">,
      view: "ALL_VIEWS",
    });

    const parsedResponses = await schema.safeParseAsync({
      name: "test",
      email: "test@gmail.com",
    });

    expect(parsedResponses.success).toBe(true);

    if (!parsedResponses.success) {
      throw new Error("Should not reach here");
    }

    expect(parsedResponses.data).toEqual({
      name: "test",
      email: "test@gmail.com",
    });
  });
});
