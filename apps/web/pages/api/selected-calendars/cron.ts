import type { NextApiRequest } from "next";

import GoogleCalendarService from "@calcom/app-store/googlecalendar/lib/CalendarService";
import { findUniqueDelegationCalendarCredential } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { CredentialForCalendarServiceWithEmail } from "@calcom/types/Credential";

const log = logger.getSubLogger({ prefix: ["[api] selected-calendars/cron"] });
const validateRequest = (req: NextApiRequest) => {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
};

async function handleCreateSelectedCalendars() {
  // Query credentials that have delegationCredentialId directly
  const delegationCredentials = await prisma.credential.findMany({
    where: {
      delegationCredentialId: { not: null },
      type: "google_calendar",
    },
  });

  if (!delegationCredentials.length) {
    return {
      message: "No delegation credentials found",
      success: 0,
      failures: 0,
    };
  }

  let totalSuccess = 0;
  let totalFailures = 0;

  const results = await Promise.allSettled(
    delegationCredentials.map(async (credential) => {
      try {
        // Skip if selected calendar already exists
        const existingSelectedCalendar = await prisma.selectedCalendar.findFirst({
          where: {
            credentialId: credential.id,
            delegationCredentialId: credential.delegationCredentialId,
          },
        });

        if (existingSelectedCalendar) {
          log.debug(
            `SelectedCalendar already exists for credential ${credential.id} and delegationCredential ${credential.delegationCredentialId}`
          );
          return;
        }

        if (!credential.userId) {
          log.error(`Credential ${credential.id} has no userId`);
          return;
        }

        const credentialForCalendarService = await findUniqueDelegationCalendarCredential({
          userId: credential.userId,
          delegationCredentialId: credential.delegationCredentialId!,
        });

        if (!credentialForCalendarService) {
          log.error(
            `Credential not found for delegationCredentialId: ${credential.delegationCredentialId} and userId: ${credential.userId}`
          );
          return;
        }

        if (
          !credentialForCalendarService.delegatedTo ||
          !credentialForCalendarService.delegatedTo.serviceAccountKey ||
          !credentialForCalendarService.delegatedTo.serviceAccountKey.client_email
        ) {
          log.error(
            `Invalid delegatedTo for delegationCredentialId: ${credential.delegationCredentialId}`,
            safeStringify({
              delegatedToSet: !!credentialForCalendarService.delegatedTo,
              serviceAccountKeySet: !!credentialForCalendarService.delegatedTo?.serviceAccountKey,
              clientEmailSet: !!credentialForCalendarService.delegatedTo?.serviceAccountKey?.client_email,
            })
          );
          return;
        }

        const googleCalendarService = new GoogleCalendarService(
          credentialForCalendarService as CredentialForCalendarServiceWithEmail
        );

        let primaryCalendar;
        try {
          primaryCalendar = await googleCalendarService.fetchPrimaryCalendar();
        } catch (error) {
          log.error(
            `Error fetching primary calendar for delegationCredentialId: ${credential.delegationCredentialId} and userId: ${credential.userId}`,
            safeStringify(error)
          );
          return;
        }

        if (!primaryCalendar || !primaryCalendar.id) {
          log.error(
            `Primary calendar not found for delegationCredentialId: ${credential.delegationCredentialId} and userId: ${credential.userId}`
          );
          return;
        }

        await prisma.selectedCalendar.create({
          data: {
            integration: "google_calendar",
            externalId: primaryCalendar.id,
            userId: credential.userId,
            delegationCredentialId: credential.delegationCredentialId!,
            credentialId: credential.id,
          },
        });

        log.debug(`Created SelectedCalendar for user ${credential.userId}`);
      } catch (error) {
        log.error(`Error processing credential ${credential.id}:`, safeStringify(error));
        throw error;
      }
    })
  );

  const successCount = results.filter((r) => r.status === "fulfilled").length;
  const failureCount = results.filter((r) => r.status === "rejected").length;

  totalSuccess += successCount;
  totalFailures += failureCount;

  log.info(
    `Completed processing all selected calendars. Total Success: ${totalSuccess}, Total Failures: ${totalFailures}`
  );

  return {
    message: "All selected calendars processed",
    executedAt: new Date().toISOString(),
    success: totalSuccess,
    failures: totalFailures,
  };
}

const handler = defaultResponder(async (request: NextApiRequest) => {
  validateRequest(request);
  return await handleCreateSelectedCalendars();
});

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
