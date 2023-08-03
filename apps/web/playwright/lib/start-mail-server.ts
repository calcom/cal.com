import { MailServer } from "./mail-server";

if (!process.env.EMAIL_SERVER_PORT) {
  throw new Error("EMAIL_SERVER_PORT env var is required to start test mail server.");
}

new MailServer(process.env.EMAIL_SERVER_PORT);
