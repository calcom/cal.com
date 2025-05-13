/**
 * @description This route is used to create SelectedCalendar records based on Credential records corresponding to Delegation Credentials
 *
 * It works in conjunction with `/api/cron/credentials` route(which creates the Credential records for all the members of an organization that has delegation credentials enabled)
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import GoogleCalendarService from "@calcom/app-store/googlecalendar/lib/CalendarService";
import { findUniqueDelegationCalendarCredential } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import type { CredentialForCalendarServiceWithEmail } from "@calcom/types/Credential";
import type { Ensure } from "@calcom/types/utils";

import { defaultResponderForAppDir } from "../../defaultResponderForAppDir";

const limitOnQueryingGoogleCalendar = 50;
const log = logger.getSubLogger({ prefix: ["[api] selected-calendars/cron"] });
const validateRequest = (req: NextRequest) => {
  const url = new URL(req.url);
  const apiKey = req.headers.get("authorization") || url.searchParams.get("apiKey");
  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
};

type DelegationUserCredential = Awaited<
  ReturnType<typeof CredentialRepository.findAllDelegationByTypeIncludeUserAndTake>
>[number];

async function getDelegationUserCredentialsToProcess(delegationUserCredentials: DelegationUserCredential[]) {
  const delegationUserCredentialsToProcess = await Promise.all(
    delegationUserCredentials
      .filter(
        (delegationUserCredential): delegationUserCredential is Ensure<DelegationUserCredential, "user"> =>
          delegationUserCredential.user !== null
      )
      .map(async (delegationUserCredential) => {
        // Consider existing SelectedCalendars for this user, regardless of credentialId as we want to reuse the existing SelectedCalendar(which has their googleChannel related column set) after Delegation Credential has been enabled
        const selectedCalendar = await SelectedCalendarRepository.findFirst({
          where: {
            userId: delegationUserCredential.user.id,
            externalId: delegationUserCredential.user.email,
          },
        });

        if (selectedCalendar) {
          if (!selectedCalendar.error) {
            log.info(`Found a reusable SelectedCalendar for ${delegationUserCredential.user.id}`);
            return null;
          } else {
            log.error(
              `SelectedCalendar for ${delegationUserCredential.user.id} has an error: '${selectedCalendar.error}', so deleting it and creating a new one`
            );

            // Delete the SelectedCalendar
            await SelectedCalendarRepository.deleteById({ id: selectedCalendar.id });
            return delegationUserCredential;
          }
        }
        return delegationUserCredential;
      })
  );

  return delegationUserCredentialsToProcess.filter(
    (credential): credential is Ensure<DelegationUserCredential, "user"> => credential !== null
  );
}

async function handleCreateSelectedCalendars() {
  // These are in DB delegation user credentials in contrast to in-memory delegation user credentials that are used elsewhere
  const allDelegationUserCredentials = await CredentialRepository.findAllDelegationByTypeIncludeUserAndTake({
    type: "google_calendar",
    take: limitOnQueryingGoogleCalendar,
  });

  if (!allDelegationUserCredentials.length) {
    const message = "No delegation credentials found";
    log.info(message);
    return {
      message,
      success: 0,
      failures: 0,
    };
  }

  // Groups delegationUserCredentials by delegationCredentialId
  const groupedDelegationUserCredentials = allDelegationUserCredentials.reduce((acc, curr) => {
    acc[curr.delegationCredentialId] = [...(acc[curr.delegationCredentialId] || []), curr];
    return acc;
  }, {} as Record<string, typeof allDelegationUserCredentials>);

  let totalSuccess = 0;
  let totalFailures = 0;

  for (const [delegationCredentialId, delegationUserCredentials] of Object.entries(
    groupedDelegationUserCredentials
  )) {
    const delegationUserCredentialsToProcess = await getDelegationUserCredentialsToProcess(
      delegationUserCredentials
    );
    log.info(
      `Found ${delegationUserCredentialsToProcess.length} delegationUserCredentials to process for delegationCredentialId: ${delegationCredentialId}`
    );

    const results = await Promise.allSettled(
      delegationUserCredentialsToProcess.map(async (delegationUserCredential) => {
        try {
          const credentialForCalendarService = await findUniqueDelegationCalendarCredential({
            userId: delegationUserCredential.user.id,
            delegationCredentialId: delegationUserCredential.delegationCredentialId,
          });

          if (!credentialForCalendarService) {
            log.error(
              `Credential not found for delegationCredentialId: ${delegationUserCredential.delegationCredentialId} and userId: ${delegationUserCredential.user.id}`
            );
            return;
          }

          if (
            !credentialForCalendarService.delegatedTo ||
            !credentialForCalendarService.delegatedTo.serviceAccountKey ||
            !credentialForCalendarService.delegatedTo.serviceAccountKey.client_email
          ) {
            log.error(
              `Invalid delegatedTo for delegationCredentialId: ${delegationUserCredential.delegationCredentialId}`,
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
              `Error fetching primary calendar for delegationCredentialId: ${delegationUserCredential.delegationCredentialId} and userId: ${delegationUserCredential.userId}`,
              safeStringify(error)
            );
            return;
          }

          if (!primaryCalendar || !primaryCalendar.id) {
            log.error(
              `Primary calendar not found for delegationCredentialId: ${delegationUserCredential.delegationCredentialId} and userId: ${delegationUserCredential.userId}`
            );
            return;
          }

          await SelectedCalendarRepository.create({
            integration: "google_calendar",
            externalId: primaryCalendar.id,
            userId: delegationUserCredential.user.id,
            delegationCredentialId: delegationUserCredential.delegationCredentialId,
            credentialId: delegationUserCredential.id,
          });

          log.debug(`Created SelectedCalendar for user ${delegationUserCredential.userId}`);
        } catch (error) {
          log.error(`Error processing credential ${delegationUserCredential.id}:`, safeStringify(error));
          throw error;
        }
      })
    );
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.filter((r) => r.status === "rejected").length;
    log.info(
      `Processed ${successCount} selected calendars for delegationCredentialId: ${delegationCredentialId} and ${failureCount} failures`
    );
    totalSuccess += successCount;
    totalFailures += failureCount;
  }

  log.info(
    `Completed creating selected calendars for all delegation credentials. Total Success: ${totalSuccess}, Total Failures: ${totalFailures}`
  );

  return {
    message: "All selected calendars created",
    executedAt: new Date().toISOString(),
    success: totalSuccess,
    failures: totalFailures,
  };
}

const handler = async (request: NextRequest) => {
  validateRequest(request);
  return NextResponse.json(await handleCreateSelectedCalendars());
};

export const GET = defaultResponderForAppDir(handler);
