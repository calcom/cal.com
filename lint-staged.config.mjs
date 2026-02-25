export default {
  "(apps|packages|companion)/**/*.{js,ts,jsx,tsx}": (files) => {
    const filtered = files.filter((f) => !f.includes("/examples/"));
    if (filtered.length === 0) return "true";
    return `biome lint --reporter summary --config-path=biome-staged.json ${filtered.join(" ")}`;
  },
  "packages/prisma/schema.prisma": ["prisma format"],
};
