import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"], // worker entry (the file that starts BullMQ workers)
  format: ["cjs"],
  target: "node18",
  bundle: true,
  sourcemap: true,
  clean: true,
  noExternal: ["@calid/job-engine", "@calcom/emails", "@calcom/dayjs", "@calcom/lib"],
  external: [
    "@prisma/client",
    "bull",
    "ioredis",

    // email rendering stack
    "react",
    "react-dom",
    "next-i18next",
    "jsdom",
    "@react-email/render",
    "@react-email/components",
  ],
});
