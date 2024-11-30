require("dotenv").config({ path: "../../.env" });
const { exec } = require("child_process");
const { URL } = require("url");

const webAppUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;
if (!webAppUrl) {
  console.error("Error: NEXT_PUBLIC_WEBAPP_URL is not defined in the environment.");
  process.exit(1);
}

const url = new URL(webAppUrl);
let port;

if (url.port) {
  console.log(`Setting port to ${url.port} from NEXT_PUBLIC_WEBAPP_URL`);
  port = url.port;
} else {
  console.warn("No port found in NEXT_PUBLIC_WEBAPP_URL. Defaulting to 3000.");
  port = 3000;
}

exec(`PORT=${port} next ${process.argv[2]}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(stderr);
  }
  console.log(stdout);
});
