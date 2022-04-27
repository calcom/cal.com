import jsonSchema from "@/json-schema/json-schema.json";
import pjson from "@/package.json";
import { withSwagger } from "next-swagger-doc";

const swaggerHandler = withSwagger({
  definition: {
    openapi: "3.0.0",
    servers: [
      { url: "https://api.cal.com/v1" },
      { url: "https://api.cal.dev/v1" },
      { url: "http://localhost:3002/v1" },
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
      security: { ApiKeyAuth: [] },
      schemas: { ...jsonSchema.definitions },
    },
  },
  apiFolder: "pages/api",
  tags: [
    "users",
    "teams",
    "memeberships",
    "selected-calendars",
    "schedules",
    "payments",
    "event-types",
    "event-type-custom-inputs",
    "destination-calendars",
    "daily-event-references",
    "booking-references",
    "availabilities",
    "attendees",
  ],
  sort: true,
});
export default swaggerHandler();
