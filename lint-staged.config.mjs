const skipWarnings = ["1", "true", "yes", "on"].includes(
  (process.env.SKIP_WARNINGS ?? "").toLowerCase()
);

export default {
  "(apps|packages|companion)/**/*.{js,ts,jsx,tsx}": (files) =>
    skipWarnings
      ? `biome lint --config-path=biome-staged.json ${files.join(" ")}`
      : `biome lint --config-path=biome-staged.json --error-on-warnings ${files.join(" ")}`,
  "packages/prisma/schema.prisma": ["prisma format"],
};
