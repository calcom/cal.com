const { execSync } = require("child_process");

const CLIENT_FILES_PATH = ".next/static/chunks";

try {
  const release = execSync("git rev-parse HEAD").toString().trim();

  // Add release
  execSync(`sentry-cli releases new ${release}`, { stdio: "inherit" });

  // Add git commits
  execSync(`sentry-cli releases set-commits ${release} --auto`, {
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
