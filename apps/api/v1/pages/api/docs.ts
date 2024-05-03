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
      url: "https://docs.cal.com",
      description: "Find more info at our main docs: https://docs.cal.com/",
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
              type: Array,
              items: {
                properties: {
                  id: {
                    type: "number",
                    example: 1,
                  },
                  success: {
                    type: "boolean",
                    example: true,
                  },
                  paymentOption: {
                    type: "string",
                    example: "ON_BOOKING",
                  },
                },
              },
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
