const { execSync } = require("child_process");

try {
  execSync("npx prisma generate", { stdio: "inherit" });
  execSync("npx prisma format", { stdio: "inherit" });
} catch (e) {
  console.error("⚠️ Prisma generate failed in postinstall:", e?.message || e);
  // Optional: allow CI to continue, or throw to fail hard
  process.exit(0);
}
