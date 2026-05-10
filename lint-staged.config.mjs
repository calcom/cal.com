const quotePath = (file) => `"${file.replace(/"/g, '\\"')}"`;

export default {
  "(apps|packages|companion)/**/*.{js,ts,jsx,tsx}": (files) => {
    // biome.json ignores **/*.d.ts; passing them in errors the run.
    const lintable = files.filter((f) => !f.endsWith(".d.ts"));
    if (lintable.length === 0) return [];
    return `biome lint --reporter summary --config-path=biome-staged.json ${lintable.map(quotePath).join(" ")}`;
  },
  "packages/prisma/schema.prisma": ["prisma format"],
};
