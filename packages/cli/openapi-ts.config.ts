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
      include: [
        "^tag:Me$",
        "^tag:Bookings$",
        "^tag:Api Keys$",
        "^tag:Calendars$",
        "^tag:Conferencing$",
        "^tag:Destination Calendars$",
        "^tag:Event Types$",
        "^tag:Event Types Private Links$",
        "^tag:Schedules$",
        "^tag:Selected Calendars$",
        "^tag:Slots$",
        "^tag:Webhooks$",
        "^tag:Orgs / Users / OOO$",
      ],
    },
  ],
});
