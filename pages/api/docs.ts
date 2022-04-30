import pjson from "@/package.json";
import modifyRes from "modify-response-middleware";
import { use } from "next-api-middleware";
import { withSwagger } from "next-swagger-doc";
import { NextApiRequest, NextApiResponse } from "next/types";

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
    },
    security: [{ ApiKeyAuth: [] }],
  },
  apiFolder: "pages/api",
});

export default use(
  modifyRes((content: string, _req: NextApiRequest, _res: NextApiResponse) => {
    if (content) {
      const parsed = JSON.parse(content);
      delete parsed.channels;
      return Buffer.from(JSON.stringify(parsed));
    }
  })
)(swaggerHandler());
