export default {
  "(apps|packages|companion)/**/*.{js,ts,jsx,tsx}": (files) =>
    `biome lint --reporter summary --config-path=biome-staged.json ${files.map(f => `"${f}"`).join(" ")}`,
  "packages/prisma/schema.prisma": ["prisma format"],
};
