import jsonSchema from "@/json-schema/json-schema.json";
import pjson from "@/package.json";
import { withSwagger } from "next-swagger-doc";

import { withCors } from "@lib/helpers/withCors";
import { withCorsMiddleware } from "@lib/helpers/withCorsMiddleware";

const swaggerHandler = withSwagger({
  definition: {
    openapi: "3.0.0",
    info: {
      title: `${pjson.name}: ${pjson.description}`,
      version: pjson.version,
    },
    components: { schemas: { ...jsonSchema.definitions } },
    definitions: jsonSchema.definitions,
  },
  apiFolder: "pages/api",
  tags: ["users", "teams", "memeberships"],
  sort: true,
});
export default withCorsMiddleware()(swaggerHandler());
