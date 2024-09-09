import type { DestinationCalendar } from "@prisma/client";
/**
 * When inviting attendees to a calendar event, sometimes the external ID is only used for internal purposes
 * Need to process the correct external ID for the calendar service
 */
declare const processExternalId: (destinationCalendar: DestinationCalendar) => string;
export default processExternalId;
//# sourceMappingURL=processExternalId.d.ts.map