const quotePath = (file) => `"${file.replace(/"/g, '\\"')}"`;

export default {
  "(apps|packages|companion)/**/*.{js,ts,jsx,tsx}": (files) =>
    `biome lint --reporter summary --config-path=biome-staged.json ${files.map(quotePath).join(" ")}`,
  "packages/prisma/schema.prisma": ["prisma format"],
};
