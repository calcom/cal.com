require("dotenv").config({ path: "../../.env" });
const { spawn } = require("child_process");
const { URL } = require("url");

const args = process.argv.slice(2);
const command = args[0];
const portFlagIndex = args.findIndex((arg) => arg === "-p" || arg === "--port");
let customPort = null;

if (portFlagIndex !== -1 && args[portFlagIndex + 1]) {
  customPort = args[portFlagIndex + 1];
  console.log("Custom port specified:", customPort);
}

const webAppUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;
if (!webAppUrl) {
  console.error("Error: NEXT_PUBLIC_WEBAPP_URL is not defined in the environment.");
  process.exit(1);
}

let port;
try {
  port = customPort || new URL(webAppUrl).port || 3000;
  console.log("Using port:", port);
} catch (error) {
  console.error("Error parsing NEXT_PUBLIC_WEBAPP_URL:", error);
  process.exit(1);
}

const nextProcess = spawn("next", [command], {
  env: { ...process.env, PORT: port },
  shell: true,
  stdio: "pipe",
});

nextProcess.stdout.on("data", (data) => {
  console.log(data.toString());
});

nextProcess.stderr.on("data", (data) => {
  console.error(data.toString());
});

nextProcess.on("close", (code) => {
  console.log(`Process exited with code ${code}`);
});

nextProcess.on("error", (error) => {
  console.error("Failed to start Next.js process:", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("\nGracefully shutting down...");
  nextProcess.kill();
  process.exit(0);
});
