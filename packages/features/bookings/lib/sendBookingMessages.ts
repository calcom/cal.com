import axios from "axios";

import type { SlackCredentialKey } from "@calcom/app-store/slack/slackKey";
import { getRichDescription } from "@calcom/lib/CalEventParser";
import type { Credential } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";

export const sendEventScheduledMessages = (calEvent: CalendarEvent, credentials: Credential[]) => {
  credentials.forEach((credential) => {
    if (credential.appId === "slack" && credential.key) {
      const {
        incoming_webhook: { url },
      } = credential.key as unknown as SlackCredentialKey;
      axios({
        method: "POST",
        url,
        data: {
          text: getRichDescription(calEvent),
        },
      });
    }
  });
};
