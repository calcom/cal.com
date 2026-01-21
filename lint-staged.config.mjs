import process from "node:process";
const skipWarnings = ["1", "true", "yes", "on"].includes(
  (process.env.SKIP_WARNINGS ?? "").toLowerCase()
);

export default {
  "(apps|packages|companion)/**/*.{js,ts,jsx,tsx}": (files) =>
    `./scripts/lint-staged-biome.sh ${files.join(" ")}`,
  "packages/prisma/schema.prisma": ["prisma format"],
};
