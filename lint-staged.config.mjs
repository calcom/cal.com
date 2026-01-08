const skipWarnings = ["1", "true", "yes", "on"].includes(
  (process.env.SKIP_WARNINGS ?? "").toLowerCase()
);

export default {
  "(apps|packages|companion)/**/*.{js,ts,jsx,tsx}": (files) =>
    skipWarnings
      ? `biome lint --config-path=biome-staged.json ${files.join(" ")}`
      : `biome lint --config-path=biome-staged.json --error-on-warnings ${files.join(" ")}`,
  "*.json": (files) => {
    // Filter out files in public directories since biome ignores them
    const filteredFiles = files.filter((f) => !f.includes("/public/"));
    if (filteredFiles.length === 0) return [];
    return `biome format --config-path=biome-staged.json ${filteredFiles.join(" ")}`;
  },
  "packages/prisma/schema.prisma": ["prisma format"],
};
