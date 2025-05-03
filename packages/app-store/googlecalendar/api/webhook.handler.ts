import type { NextApiRequest } from "next";
import { z } from "zod";

import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import prisma from "@calcom/prisma";

import { syncEvents } from "../../_calendarSync/calendarSync";
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

// Use "destination" to represent calendars tracked via CalendarSync
type CalendarType = "selected" | "destination";

async function getCalendarFromChannelId(channelId: string, resourceId: string) {
  // 1. Query Subscription first, as it's the central point for new webhook handling
  const subscription = await prisma.subscription.findFirst({
    where: {
      providerSubscriptionId: channelId,
    },
  });

  // 2. Concurrently query SelectedCalendar and CalendarSync (if subscription found)
  const [selectedCalendar, syncedCalendar] = await Promise.all([
    SelectedCalendarRepository.findFirstByGoogleChannelIdAndResourceId(channelId, resourceId),
    subscription
      ? prisma.calendarSync.findUnique({
          where: { subscriptionId: subscription.id },
        })
      : Promise.resolve(null), // If no subscription, no synced calendars
  ]);

  const calendarTypes: CalendarType[] = [];
  let googleCalendarId: string | null = null;
  let credentialId: number | null = null;
  let sourceCalendarRecordId: number | null = null; // To track which record (selected/synced) provided the info

  log.info("selectedCalendar", safeStringify(selectedCalendar));
  log.info("syncedCalendar", safeStringify(syncedCalendar));
  if (selectedCalendar) {
    calendarTypes.push("selected");
    googleCalendarId = selectedCalendar.externalId;
    credentialId = selectedCalendar.credentialId;
    sourceCalendarRecordId = selectedCalendar.id;
    log.debug(
      "Found selected calendar record",
      safeStringify({ channelId, resourceId, selectedCalendarId: selectedCalendar.id })
    );
  }

  if (syncedCalendar) {
    calendarTypes.push("destination");
    // Use the first synced calendar's info if no selected calendar was found, or verify consistency
    if (!googleCalendarId) {
      // FIXME: Both externalId and credentialId are present in Subscription table itself
      googleCalendarId = syncedCalendar.externalCalendarId;
      credentialId = syncedCalendar.credentialId;
      sourceCalendarRecordId = syncedCalendar.id;
      log.debug(
        "Using synced calendar record",
        safeStringify({ channelId, resourceId, syncedCalendarId: syncedCalendar.id })
      );
    } else if (googleCalendarId !== syncedCalendar.externalCalendarId) {
      // This case should ideally not happen if SelectedCalendar and CalendarSync point to the same external resource
      // for the *same* subscription. If it does, it indicates a potential inconsistency.
      log.error(
        "Data inconsistency: Selected calendar externalId and Synced calendar externalId do not match for the same subscription.",
        safeStringify({
          channelId,
          resourceId,
          selectedExternalId: googleCalendarId,
          syncedExternalId: syncedCalendar.externalCalendarId,
          selectedCalendarId: selectedCalendar?.id,
          syncedCalendarId: syncedCalendar.id,
          subscriptionId: subscription?.id,
        })
      );

      throw new HttpError({
        statusCode: 500,
        message:
          "Data inconsistency: Selected calendar externalId and Synced calendar externalId do not match for the same subscription.",
      });
    }
    if (!credentialId) {
      credentialId = syncedCalendar.credentialId;
    } else if (credentialId !== syncedCalendar.credentialId) {
      log.warn(
        "Credential mismatch between selected and synced calendar records for the same subscription.",
        safeStringify({
          channelId,
          resourceId,
          selectedCredentialId: credentialId,
          syncedCredentialId: syncedCalendar.credentialId,
        })
      );
    }
  }

  // If neither selected nor synced calendars are found
  if (calendarTypes.length === 0) {
    log.warn(
      "No selected or synced calendar records found for subscription",
      safeStringify({ channelId, resourceId, subscriptionId: subscription?.id })
    );
    return {
      calendarService: null,
      googleCalendarId: null,
      calendarTypes: [],
      calendarSyncId: null,
      subscriptionId: null, // Return subscriptionId if found
    };
  }

  // Ensure we have a credential ID to proceed
  if (!credentialId) {
    // This should theoretically not happen if calendarTypes is not empty
    log.error(
      "Logical error: Found calendar types but no credential ID.",
      safeStringify({
        channelId,
        resourceId,
        calendarTypes,
        sourceCalendarRecordId,
        subscriptionId: subscription?.id,
      })
    );
    throw new HttpError({
      statusCode: 500,
      message: `Internal error: Could not determine credential for calendar processing (Channel: ${channelId}, Resource: ${resourceId}).`,
    });
  }

  // Fetch the credential using the determined credentialId
  const credentialForCalendarCache = await getCredentialForCalendarCache({ credentialId: credentialId });
  if (!credentialForCalendarCache) {
    // Throw specific error if credential fetch fails
    throw new HttpError({
      statusCode: 404, // Or 500 if credential should always exist here
      message: `No credential found for credentialId: ${credentialId} (associated with ${calendarTypes.join(
        " & "
      )} calendar, source ID: ${sourceCalendarRecordId}, Channel: ${channelId}, Resource: ${resourceId})`,
    });
  }

  const calendarService = (await getCalendar(credentialForCalendarCache)) as GoogleCalendarService | null;

  if (!calendarService) {
    // Throw error if calendar service initialization fails
    throw new HttpError({
      statusCode: 500, // Service init failure is likely an internal issue
      message: `Failed to initialize calendar service for credential: ${credentialId}`,
    });
  }

  return {
    calendarService,
    googleCalendarId, // This is the crucial external ID for the Google API call
    calendarTypes,
    calendarSyncId: syncedCalendar?.id ?? null,
    subscriptionId: subscription?.id ?? null, // Pass subscription ID for potential updates
  };
}

export async function postHandler(req: NextApiRequest) {
  let channelId: string | undefined;
  let resourceId: string | undefined;
  let subscriptionId: number | null = null; // Initialize subscriptionId

  try {
    const parsedHeaders = googleHeadersSchema.parse(req.headers);
    channelId = parsedHeaders["x-goog-channel-id"];
    resourceId = parsedHeaders["x-goog-resource-id"];
    const channelToken = parsedHeaders["x-goog-channel-token"];
    const resourceState = parsedHeaders["x-goog-resource-state"];

    if (channelToken !== process.env.GOOGLE_WEBHOOK_TOKEN) {
      throw new HttpError({ statusCode: 403, message: "Invalid API key" });
    }
    // channelId and resourceId are validated by schema parsing now
    if (channelId !== "4fae4c6f-dfc6-4a2a-bbbe-4ed82bc79ace") {
      // prevent spam while testing
      return { message: "ok" };
    }
    const calendarInfo = await getCalendarFromChannelId(channelId, resourceId);
    log.info("calendarInfo", safeStringify(calendarInfo));
    subscriptionId = calendarInfo.subscriptionId; // Store subscriptionId for potential update/logging

    const { calendarService, googleCalendarId, calendarTypes } = calendarInfo;

    if (!googleCalendarId || calendarTypes.length === 0) {
      // Log already happened in getCalendarFromChannelId
      // Consider stopping the watch if no records found? Maybe handled elsewhere.
      return {
        message: `No active selected or synced calendar records found for channelId ${channelId} and resourceId ${resourceId}. Subscription ID: ${subscriptionId}`,
      };
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
        subscriptionId, // Add subscriptionId to logs
        messageNumber: req.headers["x-goog-message-number"],
      })
    );

    if (!calendarService?.onWatchedCalendarChange) {
      // Log error with more context
      log.error(
        "Calendar service does not support onWatchedCalendarChange",
        safeStringify({
          credentialId: calendarService?.credential.id,
          calendarTypes,
          googleCalendarId,
          channelId,
          resourceId,
          subscriptionId,
        })
      );
      throw new HttpError({
        statusCode: 501,
        message: "Calendar service does not support onWatchedCalendarChange",
      }); // 501 Not Implemented might be suitable
    }

    calendarService.stopWatchingCalendarsInGoogle([
      {
        googleChannelId: "d8d31942-3854-46bb-80fa-7ba63bbc0903",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "a9e502ca-54f4-43df-a1e3-d13fc747fd0d",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "9d3313ae-7326-442f-904b-15ad9cacf636",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "c37e1046-259f-4e03-b286-487b2ccb2927",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "311f916b-43ee-4c99-b764-bcc6839262c0",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "4aecd5e2-4a24-4dea-bd76-af97b81ab207",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "f324c3cd-990a-48f3-8569-1ef49e6fdab2",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "ce6b1aa4-a893-4241-8bdf-dc3aafdb5d43",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "2b8ce5a9-19f4-4312-b622-f68c533bfd02",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "b0abffff-afb0-4274-9661-98f1293bd07c",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "430ac6be-4c10-4feb-9e3b-43786b3d85da",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "04a465ee-faa7-421a-86c0-8e745c570f5c",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "5f71df26-5e0b-479f-bb49-ad3aa34f2b41",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "6d3c559e-e30a-49c2-8b2c-45e3d0768a8d",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "3ae5b9df-74cc-4220-ac84-035bbba2c866",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "67b9786d-7013-46bf-a2a1-94f905b49611",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "6abcfda9-fa69-4776-9026-d0c846ca5aa3",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "cb5b3f92-b570-425b-9ae2-67d6608fff2b",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "4537c917-7ffd-4d8d-a021-8bf9d9187e35",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "eacc963b-b144-4b7b-b563-84675edd0e78",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "2e3c8de0-5ee3-4b48-9ca5-9c11ba66f08c",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "b10cba72-8426-4513-8685-e4932e2b3102",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "ee45015c-9536-4a3b-9bc5-926a4c92e1c1",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "4b14379d-c0f2-4c8c-9e9a-d6f8a8a8402d",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "ff6309b9-fbd9-4189-8b17-dd7cd2feace5",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "01ee6fef-ace2-4686-a221-e860beec6b80",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "324d04ed-4f01-405b-9141-d13238b7f6ea",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "e837d82f-d1a4-43e2-9c5e-59e88dd4dd6e",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "fa64fded-aa22-4818-ae25-2b305cd29c25",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "2f78b8d5-defd-4741-b0db-eec522a2a088",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "cc8df950-30d3-4b4c-991c-f66643afcba3",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "526be614-7ad5-4d20-ba07-4afb9b075528",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "2f47bcf2-a2e2-4538-86a5-da5d3d23af82",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "416a16f3-a2ee-4aa8-97d8-bbe2273fa5bb",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "91550554-8845-419e-a991-5647b90239db",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "be3b2718-07ba-4daa-82c3-3949bbc81935",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "fee1751c-27ff-4734-9d48-7511c2ca9423",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "dfb6d0ce-146c-49e2-b9b7-9f6eaacbb70f",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "93a2c36b-2544-4f37-9b11-751198a1a7a7",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "fc2df900-c3f7-4b6f-80d3-1fab759b17a5",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "1f2627bb-2cad-4656-ac8e-3cfa78f41d0c",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "65425321-8ff4-40c2-8dcf-2d44fce00eeb",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "7a36dc3e-d0ff-4344-9ab4-ade7b16ec654",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "30b6072a-efe3-4652-8afe-b297cde460c7",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "c22ffe39-5797-4efc-908d-620771db60b4",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "9a4ef796-ef74-40c6-ac5c-61eebdf5df61",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "46a8b46b-8f6a-4205-9b84-b2aa3bcea987",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "bbb1e273-f2c8-4a7d-93e4-7af13b1eddb4",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "e1e8082c-735f-460a-8e1c-46e204877706",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "d77cf46d-b07e-496a-a2ec-945242cc39e4",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "6d95b535-6097-468d-a5b3-037aa58894dd",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "6333cbef-e8ce-437b-a09f-b664dcb5e2cc",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "510a196c-27d3-402c-9a2d-67346bbc92a0",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "f0c27be0-b7a4-4ea3-952e-23cfa4b4e412",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "27b568a1-2d78-44f5-99e7-4cc5c9c2f5e4",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "e08afbd7-e881-47fa-b9c6-a336d534a602",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "a67b4c0c-bfee-45e0-99c9-00c93e6d0e93",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "e4057cc5-8be1-43d3-93e5-f8e09ceca3ac",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "1192a226-626c-4842-8f99-7fdc309ec30a",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "ac089140-5eed-4303-b8be-357e46ec5b01",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "c799ff5d-73f5-4344-86a9-78021cfc7d9c",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "803b5fef-0c8a-4d6c-a489-3d32403d85a4",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "422cae9e-5f59-4b15-92cc-deb675630a7f",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "c83ceb0e-93ed-4fc9-bb05-4cdbd37cda27",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "cfaa6893-d562-404d-b1f8-ce507fd12ace",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "e56d0ee9-bb90-4fa4-991d-20b84256c9c7",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "cdd0832f-a5d9-4fe9-9228-a86e3f39b5e8",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "44ee35c3-7382-4d08-addf-301ea1ab21d3",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "d4d9e1e7-6452-48c7-a048-1da0f8b376e4",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "cb5627a5-e608-4f9a-950d-de59e69ffdec",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "73e31d25-8a18-480e-b0e1-54ee8fb0455d",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "969e3ef8-dc0b-4f04-9d14-c3ba56b5db96",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
      {
        googleChannelId: "9e977540-b5ff-4f99-89c2-ebb8907f719d",
        googleChannelResourceId: "Tf9erb8gKlLDWYNVATf2AjIO7do",
      },
    ]);
    // Pass the correct Google Calendar ID, resourceId, resourceState and the relevant calendarTypes
    const result = await calendarService.onWatchedCalendarChange(
      googleCalendarId,
      resourceId,
      resourceState,
      calendarTypes
    );

    if (result.eventsToSync) {
      await syncEvents({
        calendarEvents: result.eventsToSync,
        app: {
          type: "google_calendar",
          name: "Google Calendar",
        },
      });
    }

    if (subscriptionId !== null) {
      const { calendarSyncId } = calendarInfo;
      try {
        await Promise.all([
          prisma.subscription.update({
            where: { id: subscriptionId },
            data: { lastSyncAt: new Date() }, // Update last sync time
          }),
          calendarSyncId &&
            prisma.calendarSync.update({
              where: { id: calendarSyncId },
              data: { lastSyncedDownAt: new Date(), lastSyncDirection: "DOWNSTREAM" }, // Update last sync time
            }),
        ]);
        log.debug(
          "Updated lastSyncAt for subscription",
          safeStringify({ subscriptionId, resourceId, channelId })
        );
      } catch (error) {
        log.error(
          "Failed to update lastSyncAt for subscription",
          safeStringify(error),
          safeStringify({ subscriptionId, resourceId, channelId })
        );
        // Decide if this failure should impact the overall response (e.g., return 500?)
        // For now, log the error but return "ok" as the primary webhook logic succeeded.
      }
    } else {
      // This case might occur if only a selectedCalendar was found without a corresponding new Subscription record yet.
      // This might be expected during transition or if selectedCalendars don't always have a linked Subscription.
      log.info(
        "No subscription ID found to update lastSyncAt, likely processing for SelectedCalendar only.",
        safeStringify({ channelId, resourceId, calendarTypes })
      );
    }

    log.debug(
      `Successfully processed webhook for type(s): ${calendarTypes.join(", ")}`,
      safeStringify({
        onWatchedCalendarChangeResult: result,
        calendarTypes,
        googleCalendarId,
        resourceId,
        channelId,
        subscriptionId, // Add subscriptionId to logs
        messageNumber: req.headers["x-goog-message-number"],
      })
    );
    return { message: "ok" };
  } catch (error) {
    // Log with context if available
    const context = { channelId, resourceId, subscriptionId };
    if (error instanceof z.ZodError) {
      log.error(
        "Invalid webhook headers",
        safeStringify({ error: error.errors, headers: req.headers, context })
      );
      throw new HttpError({ statusCode: 400, message: "Invalid request headers" });
    }
    if (error instanceof HttpError) {
      // Log HttpErrors with context before re-throwing
      log.error(
        `HttpError processing webhook: ${error.message}`,
        safeStringify({ statusCode: error.statusCode, context })
      );
      throw error;
    }
    log.error("Unexpected error processing webhook", safeStringify(error), safeStringify({ context }));
    throw new HttpError({ statusCode: 500, message: "Internal server error" });
  }
}
