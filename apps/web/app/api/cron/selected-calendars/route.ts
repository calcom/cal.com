/**
 * @description This route is used to create SelectedCalendar records based on Credential records corresponding to Delegation Credentials
 *
 * It works in conjunction with `/api/cron/credentials` route(which creates the Credential records for all the members of an organization that has delegation credentials enabled)
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import GoogleCalendarService from "@calcom/app-store/googlecalendar/lib/CalendarService";
import { CalendarAppDelegationCredentialInvalidGrantError } from "@calcom/lib/CalendarAppError";
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
const log = logger.getSubLogger({ prefix: ["[api]", "[delegation]", "[selected-calendars/cron]"] });
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

type DelegationUserCredentialWithEnsuredUser = Ensure<DelegationUserCredential, "user">;

async function getDelegationUserCredentialsToProcess(delegationUserCredentials: DelegationUserCredential[]) {
  const delegationUserCredentialsToProcess = await Promise.all(
    delegationUserCredentials
      .filter(
        (delegationUserCredential): delegationUserCredential is DelegationUserCredentialWithEnsuredUser =>
          delegationUserCredential.user !== null
      )
      .map(async (delegationUserCredential) => {
        const userEmail = delegationUserCredential.user.email;
        // Consider existing SelectedCalendars for this user, regardless of credentialId as we want to reuse the existing SelectedCalendar(which has their googleChannel related column set) after Delegation Credential has been enabled
        // It is also important because SelectedCalendar has composite unique constraint on userId, externalId and integration and thus we couldn't have the same values for different credentialId
        const selectedCalendar = await SelectedCalendarRepository.findFirst({
          where: {
            userId: delegationUserCredential.user.id,
            externalId: userEmail,
            integration: "google_calendar",
          },
        });

        if (selectedCalendar) {
          if (selectedCalendar.delegationCredentialId === delegationUserCredential.delegationCredentialId) {
            // In case this SelectedCalendar has an error, we would let CalendarCache cron handle it
            log.info(
              `Found an existing SelectedCalendar for userId: ${delegationUserCredential.user.id} and delegationCredentialId: ${delegationUserCredential.delegationCredentialId}`
            );
            return null;
          }
          if (!selectedCalendar.error) {
            log.info(`Found a reusable SelectedCalendar for userId: ${delegationUserCredential.user.id}`);
            return null;
          } else {
            log.error(
              `Found reusable Non-Delegation SelectedCalendar for ${delegationUserCredential.user.id} but it has an error: '${selectedCalendar.error}', so deleting it, new one will be created`
            );

            // We found a SelectedCalendar attached to non-delegation credential, so we shouldn't reuse it as the non-delegation credential attached to it could be invalid
            // So, we delete it so that SelectedCalendarRepository allow creating a similar one with Delegation Credential
            // Also, we don't delete the possibly invalid credential due to false alarm and we would need that intact in case we disable Delegation Credential
            // Because credential isn't deleted, the corresponding CalendarCache entry would still exist and thus we will end up having two CalendarCache entries for same key and userId with different credentialId
            await SelectedCalendarRepository.deleteById({ id: selectedCalendar.id });
            return delegationUserCredential;
          }
        }
        return delegationUserCredential;
      })
  );

  return delegationUserCredentialsToProcess.filter(
    (credential): credential is DelegationUserCredentialWithEnsuredUser => credential !== null
  );
}

async function getCalendarService(delegationUserCredential: DelegationUserCredentialWithEnsuredUser) {
  const credentialForCalendarService = await findUniqueDelegationCalendarCredential({
    userId: delegationUserCredential.user.id,
    delegationCredentialId: delegationUserCredential.delegationCredentialId,
  });

  if (!credentialForCalendarService) {
    log.error(
      `Credential not found for delegationCredentialId: ${delegationUserCredential.delegationCredentialId} and userId: ${delegationUserCredential.user.id}`
    );
    return null;
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
    return null;
  }

  const googleCalendarService = new GoogleCalendarService(
    credentialForCalendarService as CredentialForCalendarServiceWithEmail
  );

  return googleCalendarService;
}

async function fetchPrimaryCalendarId({
  googleCalendarService,
  delegationUserCredential,
}: {
  googleCalendarService: GoogleCalendarService;
  delegationUserCredential: DelegationUserCredentialWithEnsuredUser;
}) {
  let primaryCalendarId;
  const userEmail = delegationUserCredential.user.email;

  try {
    const primaryCalendar = await googleCalendarService.fetchPrimaryCalendar();
    primaryCalendarId = primaryCalendar?.id;
  } catch (error) {
    log.error(
      `Error fetching primary calendar for delegationCredentialId: ${delegationUserCredential.delegationCredentialId}, credentialId: ${delegationUserCredential.id} and userId: ${delegationUserCredential.userId}`,
      safeStringify(error)
    );

    if (error instanceof CalendarAppDelegationCredentialInvalidGrantError) {
      // It is known to happen in case john+test@acme.com is the user email and the actual email is john@acme.com. Google rejects the authorization for john+test@acme.com
      log.info(
        `Error seems to be that the email isn't present in the third party workspace, further attempts would fail too, so we assume the user's email as the primary calendar id to skip this user in future cron runs`
      );
      // If we are unable to fetch the primary calendar, we assume the user's email as the primary calendar id
      // It ensures that this calendar is skipped in the future cron runs
      primaryCalendarId = userEmail;
    }
  }

  return primaryCalendarId;
}

async function processDelegationUserCredential(
  delegationUserCredential: DelegationUserCredentialWithEnsuredUser
) {
  try {
    const userEmail = delegationUserCredential.user.email;
    const googleCalendarService = await getCalendarService(delegationUserCredential);
    if (!googleCalendarService) {
      return;
    }

    const externalCalendarId = await fetchPrimaryCalendarId({
      googleCalendarService,
      delegationUserCredential,
    });

    if (!externalCalendarId) {
      log.error(
        `External calendar not found for delegationCredentialId: ${delegationUserCredential.delegationCredentialId}, credentialId: ${delegationUserCredential.id} and userId: ${delegationUserCredential.userId}`
      );
      throw new Error("externalCalendarId could not be determined");
    }

    if (externalCalendarId !== userEmail) {
      // We don't know the scenario when Delegation Credential allows access to an email that is not the primary calendar email
      // So log a warning for further investigation
      log.warn(
        `External calendar id mismatch for delegationCredentialId: ${delegationUserCredential.delegationCredentialId}, credentialId: ${delegationUserCredential.id} and userId: ${delegationUserCredential.userId}`,
        safeStringify({
          externalCalendarId,
          userEmail,
        })
      );
    }

    await SelectedCalendarRepository.create({
      integration: "google_calendar",
      externalId: externalCalendarId,
      userId: delegationUserCredential.user.id,
      delegationCredentialId: delegationUserCredential.delegationCredentialId,
      credentialId: delegationUserCredential.id,
    });

    log.debug(`Created SelectedCalendar for user ${delegationUserCredential.userId}`);
  } catch (error) {
    log.error(`Error processing credential ${delegationUserCredential.id}:`, safeStringify(error));
    throw error;
  }
}

export async function handleCreateSelectedCalendars() {
  // These are in DB delegation user credentials in contrast to in-memory delegation user credentials that are used elsewhere
  const allDelegationUserCredentials = await CredentialRepository.findAllDelegationByTypeIncludeUserAndTake({
    type: "google_calendar",
    take: limitOnQueryingGoogleCalendar,
  });

  log.info(`Found ${allDelegationUserCredentials.length} delegation user credentials to process`);

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
    log.info(`Processing delegation user credentials for delegationCredentialId: ${delegationCredentialId}`);
    const delegationUserCredentialsToProcess = await getDelegationUserCredentialsToProcess(
      delegationUserCredentials
    );
    log.info(
      `Found ${delegationUserCredentialsToProcess.length} delegationUserCredentials to process for delegationCredentialId: ${delegationCredentialId}`
    );

    const results = await Promise.allSettled(
      delegationUserCredentialsToProcess.map(processDelegationUserCredential)
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
