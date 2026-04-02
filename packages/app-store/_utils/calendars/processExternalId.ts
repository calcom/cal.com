import type { DestinationCalendar } from "@calcom/prisma/client";
import { metadata as OutlookMetadata } from "../../office365calendar";

/**
 * When inviting attendees to a calendar event, sometimes the external ID is only used for internal purposes
 * Need to process the correct external ID for the calendar service
 */
const processExternalId = (destinationCalendar: DestinationCalendar) => {
  if (destinationCalendar.integration === OutlookMetadata.type) {
    // Primary email should always be present for Outlook
    return destinationCalendar.primaryEmail || destinationCalendar.externalId;
  }

  return destinationCalendar.externalId;
};

export default processExternalId;
