import { withSwagger } from "next-swagger-doc";

import pjson from "~/package.json";

const swaggerHandler = withSwagger({
  definition: {
    openapi: "3.0.3",
    servers: [
      { url: "http://localhost:3002/v1" },
      { url: "https://api.cal.dev/v1" },
      { url: "https://api.cal.com/v1" },
    ],
    externalDocs: {
      url: "https://docs.cal.com/docs",
      description: "Find more info at our main docs: https://docs.cal.com/docs/",
    },
    info: {
      title: `${pjson.name}: ${pjson.description}`,
      version: pjson.version,
    },
    components: {
      securitySchemes: { ApiKeyAuth: { type: "apiKey", in: "query", name: "apiKey" } },
      schemas: {
        ArrayOfBookings: {
          type: "array",
          items: {
            $ref: "#/components/schemas/Booking",
          },
        },
        ArrayOfRecordings: {
          type: "array",
          items: {
            $ref: "#/components/schemas/Recording",
          },
        },
        Payment: {
          type: "object",
          properties: {
            id: {
              type: "number",
              example: 1,
              description: "Payment ID",
            },
            uid: {
              type: "string",
              example: "payment_abc123",
              description: "Payment UID used for abandoned-cart recovery",
            },
            amount: {
              type: "number",
              example: 5000,
              description: "Payment amount in cents",
            },
            success: {
              type: "boolean",
              example: true,
              description: "Whether the payment was successful",
            },
            refunded: {
              type: "boolean",
              example: false,
              description: "Whether the payment was refunded",
            },
            fee: {
              type: "number",
              example: 150,
              description: "Payment processing fee in cents",
            },
            paymentOption: {
              type: "string",
              example: "ON_BOOKING",
              description: "Payment option type",
            },
            currency: {
              type: "string",
              example: "USD",
              description: "Payment currency",
            },
            bookingId: {
              type: "number",
              example: 123,
              description: "Associated booking ID",
            },
          },
          required: [
            "id",
            "uid",
            "amount",
            "success",
            "refunded",
            "fee",
            "paymentOption",
            "currency",
            "bookingId",
          ],
        },
        ArrayOfPayments: {
          type: "array",
          items: {
            $ref: "#/components/schemas/Payment",
          },
        },
        Recording: {
          properties: {
            id: {
              type: "string",
            },
            room_name: {
              type: "string",
            },
            start_ts: {
              type: "number",
            },
            status: {
              type: "string",
            },
            max_participants: {
              type: "number",
            },
            duration: {
              type: "number",
            },
            download_link: {
              type: "string",
            },
          },
        },
        Booking: {
          properties: {
            id: {
              type: "number",
            },
            description: {
              type: "string",
            },
            eventTypeId: {
              type: "number",
            },
            uid: {
              type: "string",
              format: "uuid",
            },
            title: {
              type: "string",
            },
            startTime: {
              type: "string",
              format: "date-time",
            },
            endTime: {
              type: "string",
              format: "date-time",
            },
            timeZone: {
              type: "string",
              example: "Europe/London",
            },
            fromReschedule: {
              type: "string",
              nullable: true,
              format: "uuid",
            },
            attendees: {
              type: "array",
              items: {
                properties: {
                  email: {
                    type: "string",
                    example: "example@cal.com",
                  },
                  name: {
                    type: "string",
                  },
                  timeZone: {
                    type: "string",
                    example: "Europe/London",
                  },
                  locale: {
                    type: "string",
                    example: "en",
                  },
                },
              },
            },
            user: {
              properties: {
                email: {
                  type: "string",
                  example: "example@cal.com",
                },
                name: {
                  type: "string",
                },
                timeZone: {
                  type: "string",
                  example: "Europe/London",
                },
                locale: {
                  type: "string",
                  example: "en",
                },
              },
            },
            payment: {
              $ref: "#/components/schemas/ArrayOfPayments",
            },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    tags: [
      { name: "users" },
      { name: "event-types" },
      { name: "bookings" },
      { name: "attendees" },
      { name: "payments" },
      { name: "schedules" },
      { name: "teams" },
      { name: "memberships" },
      {
        name: "availabilities",
        description: "Allows modifying unique availabilities tied to a schedule.",
      },
      { name: "custom-inputs" },
      { name: "event-references" },
      { name: "booking-references" },
      { name: "destination-calendars" },
      { name: "selected-calendars" },
    ],
  },
  apiFolder: "pages/api",
});

export default swaggerHandler();
