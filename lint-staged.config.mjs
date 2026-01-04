const skipWarnings = ["1", "true", "yes", "on"].includes(
  (process.env.SKIP_WARNINGS ?? "").toLowerCase()
);

export default {
  "(apps|packages|companion)/**/*.{js,ts,jsx,tsx}": (files) =>
    skipWarnings
      ? `biome lint ${files.join(" ")} --max-diagnostics=200`
      : `biome lint --error-on-warnings --max-diagnostics=200 ${files.join(" ")}`,
  "*.json": (files) => `biome format ${files.join(" ")}`,
  "packages/prisma/schema.prisma": ["prisma format"],
};
