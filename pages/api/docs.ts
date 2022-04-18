import jsonSchema from "@/json-schema/json-schema.json";
import pjson from "@/package.json";
import { withSwagger } from "next-swagger-doc";

const swaggerHandler = withSwagger({
  definition: {
    openapi: "3.0.0",
    info: {
      title: `${pjson.name}: ${pjson.description}`,
      version: pjson.version,
    },
    components: {
      securitySchemes: { ApiKeyAuth: { type: "apiKey", in: "query", name: "apiKey" } },
      schemas: { ...jsonSchema.definitions },
    },
  },
  apiFolder: "pages/api",
  tags: ["users", "teams", "memeberships"],
  sort: true,
});
export default swaggerHandler();
