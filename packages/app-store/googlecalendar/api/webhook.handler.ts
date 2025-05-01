import type { NextApiRequest } from "next";
import { z } from "zod";

import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { DestinationCalendarRepository } from "@calcom/lib/server/repository/destinationCalendar";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import prisma from "@calcom/prisma";

import { getCalendar } from "../../_utils/getCalendar";
import type GoogleCalendarService from "../lib/CalendarService";

const log = logger.getSubLogger({ prefix: ["GoogleCalendarWebhook"] });

const googleHeadersSchema = z.object({
  "x-goog-channel-expiration": z.string(), // Sat, 22 Mar 2025 19:14:43 GMT
  "x-goog-channel-id": z.string(), // xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  "x-goog-channel-token": z.string(), // XXXXXXXXXXXXXXXXXXx/XXXXXXXXXXXX=
  "x-goog-message-number": z.string(), // 398005
  "x-goog-resource-id": z.string(), // XXXXXXXXXXXXXXXXXX_XXX
  /**
   * 'exists' - Resource exists and is changed
   * 'not_found' - Resource has been deleted
   * 'sync' - Initial sync when someone subscribes to the channel
   */
  "x-goog-resource-state": z.string(),
  "x-goog-resource-uri": z.string(), // https://www.googleapis.com/calendar/v3/calendars/user%40example.com/events?alt=json
});

type CalendarType = "selected" | "destination";

async function getCalendarFromChannelId(channelId: string, resourceId: string) {
  // Fetch both selected and destination calendars concurrently
  const [selectedCalendar, destinationCalendar] = await Promise.all([
    SelectedCalendarRepository.findFirstByGoogleChannelIdAndResourceId(channelId, resourceId),
    DestinationCalendarRepository.findFirstByGoogleChannelIdAndResourceId(channelId, resourceId),
  ]);

  let calendarTypes: CalendarType[] = [];

  if (selectedCalendar && destinationCalendar) {
    log.debug(
      "Found both selected and destination calendar records",
      safeStringify({ channelId, resourceId })
    );
    // If both are found, validate their external IDs
    const selectedExternalId = selectedCalendar.externalId;
    const destinationExternalId = destinationCalendar.externalId;

    if (selectedExternalId !== destinationExternalId) {
      throw new HttpError({
        statusCode: 500, // Or 409 Conflict? 500 seems appropriate for unexpected state mismatch
        message: `Data inconsistency: Selected calendar externalId (${selectedExternalId}) and Destination calendar externalId (${destinationExternalId}) do not match for the same channelId (${channelId}) and resourceId (${resourceId}).`,
      });
    }

    calendarTypes = ["selected", "destination"];
  } else if (selectedCalendar) {
    calendarTypes = ["selected"];
  } else if (destinationCalendar) {
    calendarTypes = ["destination"];
  }

  const calendar = selectedCalendar || destinationCalendar;

  // If no calendar record found in either repository
  if (!calendar) {
    return {
      calendarService: null,
      googleCalendarId: null,
      calendarTypes,
    };
  }

  // Process the prioritized calendar record to get the service and common googleCalendarId
  // Note: 'id' from prioritizedCalendar is only used for logging/error messages now
  const { credential, externalId: googleCalendarId } = calendar;

  if (!credential) {
    throw new HttpError({
      statusCode: 404,
      message: `No credential found for ${calendarType} calendar (ID: ${calendarId}) for googleChannelId: ${channelId}, resourceId: ${resourceId}`,
    });
  }

  const credentialForCalendarCache = await getCredentialForCalendarCache({ credentialId: credential.id });
  const calendarService = (await getCalendar(credentialForCalendarCache)) as GoogleCalendarService | null; // Cast to access specific methods

  if (!calendarService) {
    throw new HttpError({
      statusCode: 404,
      message: `No calendar service found for credential: ${credential.id}`,
    });
  }

  return {
    calendarService,
    googleCalendarId,
    calendarTypes,
  };
}

export async function postHandler(req: NextApiRequest) {
  try {
    const {
      "x-goog-channel-token": channelToken,
      "x-goog-channel-id": channelId,
      "x-goog-resource-id": resourceId,
      /**
       * 'exists' - Event exists and is changed
       * 'not_found' - Event is deleted
       * 'sync' - Initial sync when someone subscribes to the channel
       */
      "x-goog-resource-state": resourceState,
    } = googleHeadersSchema.parse(req.headers);

    // log.debug(
    //   "Webhook received",
    //   safeStringify({
    //     channelToken,
    //     channelId,
    //     resourceId,
    //     resourceState,
    //     messageNumber: req.headers["x-goog-message-number"],
    //     timestamp: new Date().toISOString(),
    //   })
    // );

    if (channelToken !== process.env.GOOGLE_WEBHOOK_TOKEN) {
      throw new HttpError({ statusCode: 403, message: "Invalid API key" });
    }
    if (!channelId) {
      throw new HttpError({ statusCode: 403, message: "Missing Channel ID" });
    }

    const { calendarService, googleCalendarId, calendarTypes, destinationCalendarId } =
      await getCalendarFromChannelId(channelId, resourceId);

    if (!googleCalendarId || calendarTypes.length === 0) {
      return { message: "no record found attached with this channelId and resourceId" };
    }

    // Now we have the actual Google Calendar ID (googleCalendarId) and the resourceId
    log.info(
      `Processing webhook for ${calendarTypes.join(" & ")} Calendar(s): ${googleCalendarId}`,
      safeStringify({
        calendarTypes: calendarTypes.join(", "),
        googleCalendarId,
        resourceId,
        resourceState,
        channelId,
        messageNumber: req.headers["x-goog-message-number"],
      })
    );

    if (!calendarService?.onWatchedCalendarChange) {
      throw new HttpError({ statusCode: 404, message: "Calendar does not support onWatchedCalendarChange" });
    }

    // Pass the correct Google Calendar ID, resourceId, resourceState and the current calendarType
    await calendarService.onWatchedCalendarChange(googleCalendarId, resourceId, resourceState, calendarTypes);
    log.debug(
      `Successfully processed webhook for type: ${calendarTypes}`,
      safeStringify({
        calendarTypes,
        googleCalendarId,
        resourceId,
        channelId,
        messageNumber: req.headers["x-goog-message-number"],
      })
    );

    // Update lastProcessedTime only if a destination calendar was involved
    if (calendarTypes.includes("destination") && destinationCalendarId !== null) {
      try {
        await prisma.destinationCalendar.updateMany({
          where: {
            integration: "google_calendar",
            externalId: googleCalendarId,
          },
          data: {
            lastProcessedTime: new Date(),
          },
        });
        log.debug(
          "Updated lastProcessedTime for destination calendar",
          safeStringify({ destinationCalendarId, resourceId })
        );
      } catch (error) {
        log.error(
          "Failed to update lastProcessedTime for destination calendar",
          safeStringify(error),
          safeStringify({ destinationCalendarId, resourceId })
        );
      }
    }
    return { message: "ok" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.error("Invalid webhook headers", safeStringify({ error: error.errors, headers: req.headers }));
      throw new HttpError({ statusCode: 400, message: "Invalid request headers" });
    }
    if (error instanceof HttpError) {
      throw error;
    }
    log.error("Unexpected error processing webhook", safeStringify({ error }));
    throw new HttpError({ statusCode: 500, message: "Internal server error" });
  }
}
