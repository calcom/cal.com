import pjson from "@/package.json";
import { withSwagger } from "next-swagger-doc";

const swaggerHandler = withSwagger({
  definition: {
    openapi: "3.0.0",
    info: {
      title: `${pjson.name}: ${pjson.description}`,
      version: pjson.version,
    },
    tags: ["users", "teams"],
  },
  apiFolder: "pages/api",
});
export default swaggerHandler();
