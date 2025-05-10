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

  // Get the current commit SHA
  const release = execSync("git rev-parse HEAD").toString().trim();

  // Get repository name from git remote
  const remoteUrl = execSync("git remote get-url origin").toString().trim();
  // Handle both SSH and HTTPS URLs, and different git hosting services
  const repoMatch = remoteUrl.match(/(?:[:/])([^/]+\/[^/]+?)(?:\.git)?$/);
  const repo = repoMatch ? repoMatch[1] : null;

  // Add release
  execSync(`sentry-cli releases new ${release}`, { stdio: "inherit" });

  // Set the current commit for this release
  if (!repo) {
    console.log("Could not determine repository name from git remote, skipping set-commits");
  } else {
    execSync(`sentry-cli releases set-commits ${release} --repo ${repo} --commit "${release}"`, {
      stdio: "inherit",
    });
  }

  // Inject Debug IDs
  execSync(`sentry-cli sourcemaps inject ${CLIENT_FILES_PATH}`, { stdio: "inherit" });

  // Upload with release flag
  execSync(
    `sentry-cli sourcemaps upload ${CLIENT_FILES_PATH} --validate --ext=js --ext=map --release=${release} --ignore-missing`,
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
