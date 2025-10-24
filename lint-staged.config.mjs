export default {
  "(apps|packages)/**/*.{js,ts,jsx,tsx}": [
    "prettier --write",
    process.env.SKIP_WARNINGS === "1" ? "eslint --fix" : "eslint --fix --max-warnings=0",
  ],
  "*.json": ["prettier --write"],
  "packages/prisma/schema.prisma": ["prisma format"],
};
