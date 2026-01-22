export default {
  "(apps|packages|companion)/**/*.{js,ts,jsx,tsx}": (files) =>
    `biome lint --config-path=biome-staged.json ${files.map((file) => `"${file}"`).join(" ")}`,
  "packages/prisma/schema.prisma": ["prisma format"],
};
