import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import logger from "@calcom/lib/logger";
import { performance } from "@calcom/lib/server/perfObserver";
import type { CalendarFetchMode, EventBusyDate, IntegrationCalendar } from "@calcom/types/Calendar";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

const log = logger.getSubLogger({ prefix: ["getBatchCalendarEvents"] });

interface BatchRequest {
  credential: CredentialForCalendarService;
  externalIds: string[];
}

interface BatchResult {
  [externalId: string]: EventBusyDate[];
}

export const getBatchCalendarEvents = async (
  requests: BatchRequest[],
  dateFrom: string,
  dateTo: string,
  mode: CalendarFetchMode = "slots"
): Promise<BatchResult> => {
  performance.mark("getBatchCalendarEventsStart");

  // Group by credential ID to ensure unique credentials
  // (In practice, caller should probably pass unique credentials, but we can safety check)
  // Actually, requests might be just list of credentials.
  const uniqueCredentialRequests = requests;

  const results: BatchResult = {};

  await Promise.all(
    uniqueCredentialRequests.map(async ({ credential, externalIds }) => {
      try {
        // Initialize all IDs as empty in the results map to prevent individual fallbacks later
        externalIds.forEach((id) => {
          if (!results[id]) results[id] = [];
        });

        // For delegation credentials, if we have multiple users, we attempt a subject-less call
        // which might have broader permissions if configured in the Workspace.
        const batchCredential = {
          ...credential,
          user: externalIds.length > 1 && !!credential.delegatedToId ? null : credential.user,
        };

        const calendarService = await getCalendar(batchCredential as any, mode);
        if (!calendarService) {
          console.log(`getBatchCalendarEvents: No calendar service for credential ${credential.id}`);
          return;
        }

        console.log(
          `getBatchCalendarEvents: Batching ${externalIds.length} IDs for credential ${credential.id}${batchCredential.user ? ` (Subject: ${batchCredential.user.email})` : " (Subject-less)"}: ${externalIds.join(", ")}`
        );

        // Construct selectedCalendars objects as expected by getAvailability
        // We only really need externalId and integration for the service to work usually
        const selectedCalendars: IntegrationCalendar[] = externalIds.map((id) => ({
          externalId: id,
          integration: credential.type,
          // minimal mock of IntegrationCalendar
        }));

        console.log(
          `getBatchCalendarEvents: Fetching for credential ${credential.id} with ${externalIds.length} calendars. Key has access_token: ${!!(credential.key as any)?.access_token}`
        );

        const busyTimes = await calendarService.getAvailability({
          dateFrom,
          dateTo,
          selectedCalendars,
          mode,
          fallbackToPrimary: false, // We are specific about what we want
        });

        // Distribute results back to the map
        // For Google Calendar, we expect 'source' to be the calendar ID (externalId)
        // For others, if 'source' is missing, we might have an issue attributing it if we batched multiple.
        // However, if the adapter returns flattened results without source, we can't do much.
        // We will assume that if source is present, it matches externalId.

        busyTimes.forEach((busy) => {
          if (busy.source && externalIds.includes(busy.source)) {
            if (!results[busy.source]) {
              results[busy.source] = [];
            }
            results[busy.source].push(busy);
          } else if (externalIds.length === 1) {
            // If we only asked for one calendar, we can safely attribute all results to it
            // even if source is missing or different
            const singleId = externalIds[0];
            if (!results[singleId]) results[singleId] = [];
            results[singleId].push(busy);
          } else {
            // Warn? Or maybe log debug.
            // If we batched multiple and got results without source, we drop them or assign to all?
            // Assigning to all is risky. Dropping is also bad.
            // For now, let's log.
            log.debug(`Received busy time without matching source for batched request`, {
              busy,
              externalIds,
            });
          }
        });

        const returnedIds = Object.keys(results).filter((id) => externalIds.includes(id));
        const missingIds = externalIds.filter((id) => !returnedIds.includes(id));

        const resultsSummary = returnedIds.map((id) => `${id}: ${results[id].length} slots`).join(", ");
        console.log(
          `getBatchCalendarEvents: Results Summary [Req: ${externalIds.length}, Got: ${returnedIds.length}]`
        );
        if (returnedIds.length > 0) console.log(`  - Returned: ${resultsSummary}`);
        if (missingIds.length > 0)
          console.log(
            `  - No busy slots found for: ${missingIds.join(", ")} (User might be free or access denied)`
          );
      } catch (error) {
        log.error(`Failed to batch fetch for credential ${credential.id}`, error);
      }
    })
  );

  performance.mark("getBatchCalendarEventsEnd");
  performance.measure(
    `getBatchCalendarEvents took $1`,
    "getBatchCalendarEventsStart",
    "getBatchCalendarEventsEnd"
  );

  return results;
};
