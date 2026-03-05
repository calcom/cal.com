import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  client: "@hey-api/client-fetch",
  input: "../../docs/api-reference/v2/openapi.json",
  output: {
    path: "src/generated",
    lint: "biome",
  },
  plugins: [
    {
      name: "@hey-api/typescript",
      enums: "javascript",
    },
    {
      name: "@hey-api/sdk",
      asClass: false,
      operationId: true,
    },
  ],
});
