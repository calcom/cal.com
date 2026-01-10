import { execSync } from "node:child_process";

function checkCommandExists(command: string): boolean {
  try {
    execSync(`${command} --version`, { stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
}

try {
  // Check if docker is installed
  if (!checkCommandExists("docker")) {
    throw new Error("Docker is not installed");
  }

  // Try docker compose first (new syntax)
  try {
    execSync("docker compose version", { stdio: "ignore" });
    console.log("Starting containers with docker compose...");
    execSync("docker compose up -d", { stdio: "inherit" });
  } catch (e) {
    // Fall back to docker-compose if the above fails
    if (checkCommandExists("docker-compose")) {
      console.log("Starting containers with docker-compose...");
      execSync("docker-compose up -d", { stdio: "inherit" });
    } else {
      throw new Error("Neither 'docker compose' nor 'docker-compose' command is available");
    }
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`);
  process.exit(1);
}
