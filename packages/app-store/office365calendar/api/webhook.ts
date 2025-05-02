import type { NextApiRequest, NextApiResponse } from "next";

import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { getCalendar } from "../../_utils/getCalendar";
import { graphValidationTokenChallengeSchema, changeNotificationWebhookPayloadSchema } from "../zod";

const log = logger.getSubLogger({ prefix: ["Office365CalendarWebhook"] });

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const graphValidationTokenChallengeParseRes = graphValidationTokenChallengeSchema.safeParse(req.query);
  if (!graphValidationTokenChallengeParseRes.success) {
    throw new HttpError({ statusCode: 403, message: "Missing validation token" });
  }

  const validationToken = graphValidationTokenChallengeParseRes.data;

  res.setHeader("Content-Type", "text/plain");
  return res.status(200).send(validationToken);
}

interface WebhookResponse {
  [key: string]: {
    processed: boolean;
    message?: string;
  };
}

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const webhookBodyParseRes = changeNotificationWebhookPayloadSchema.safeParse(req.body);

  if (!webhookBodyParseRes.success) {
    log.error("postHandler", safeStringify(webhookBodyParseRes.error));
    return res.status(400).json({
      message: "Invalid request body",
    });
  }

  const events = webhookBodyParseRes.data.value;
  const body: WebhookResponse = {};

  const promises = events.map(async (event) => {
    if (!isApiKeyValid(event.clientState)) {
      body[event.subscriptionId] = {
        processed: false,
        message: "Invalid API key",
      };
      return;
    }

    const selectedCalendar = await SelectedCalendarRepository.findByOutlookSubscriptionId(
      event.subscriptionId
    );
    if (!selectedCalendar) {
      body[event.subscriptionId] = {
        processed: false,
        message: `No selected calendar found for outlookSubscriptionId: ${event.subscriptionId}`,
      };
      return;
    }

    const { credential } = selectedCalendar;
    if (!credential) {
      body[event.subscriptionId] = {
        processed: false,
        message: `No credential found for selected calendar for outlookSubscriptionId: ${event.subscriptionId}`,
      };
      return;
    }

    const { selectedCalendars } = credential;
    const credentialForCalendarCache = await getCredentialForCalendarCache({ credentialId: credential.id });
    const calendarServiceForCalendarCache = await getCalendar(credentialForCalendarCache);

    await calendarServiceForCalendarCache?.fetchAvailabilityAndSetCache?.(selectedCalendars);
    body[event.subscriptionId] = {
      processed: true,
      message: "ok",
    };
    return;
  });

  await Promise.all(promises);

  return res.status(200).json(body);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return getHandler(req, res);
  if (req.method === "POST") return postHandler(req, res);

  res.setHeader("Allow", "POST, GET");
  return res.status(405).json({});
}

function isApiKeyValid(clientState?: string) {
  return clientState === process.env.OUTLOOK_WEBHOOK_TOKEN;
}
