const { execSync } = require("child_process");

const CLIENT_FILES_PATH = ".next/static/chunks";

try {
  // Continue if required any env vars are not set
  const requiredEnvVars = ["SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"];
  const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
  if (missingEnvVars.length > 0) {
    console.log(
      `Skipping release creation as required environment variables are not set: ${missingEnvVars.join(", ")}`
    );
    process.exit(0);
  }

  const release = execSync("git rev-parse HEAD").toString().trim();

  // Add release
  execSync(`sentry-cli releases new ${release}`, { stdio: "inherit" });

  // Add git commits
  execSync(`sentry-cli releases set-commits ${release} --auto --ignore-missing`, {
    stdio: "inherit",
  });

  // Inject Debug IDs
  execSync(`sentry-cli sourcemaps inject ${CLIENT_FILES_PATH}`, { stdio: "inherit" });

  // Upload with release flag
  execSync(
    `sentry-cli sourcemaps upload ${CLIENT_FILES_PATH} --validate --ext=js --ext=map --release=${release}`,
    {
      stdio: "inherit",
      env: process.env,
    }
  );

  // Finalize the release
  execSync(`sentry-cli releases finalize ${release}`, { stdio: "inherit" });
} catch (err) {
  console.error("Sentry cli execution failed:", err);
  process.exit(1);
}
