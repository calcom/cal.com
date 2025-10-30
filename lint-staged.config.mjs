export default {
  "(apps|packages)/**/*.{js,ts,jsx,tsx}": (files) =>
    process.env.SKIP_WARNINGS === "1"
      ? `eslint --fix --flag v10_config_lookup_from_file ${files.join(" ")}`
      : `eslint --fix --flag v10_config_lookup_from_file --max-warnings=0 ${files.join(" ")}`,
  "*.json": ["prettier --write"],
  "packages/prisma/schema.prisma": ["prisma format"],
};
