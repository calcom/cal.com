import { MailServer } from "./mail-server";

new MailServer(process.env.EMAIL_SERVER_PORT || 8825);
