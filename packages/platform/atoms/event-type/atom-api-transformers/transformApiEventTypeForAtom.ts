import { defaultEvents } from "@calcom/lib/defaultEvents";
import {
  transformApiEventTypeLocations,
  transformApiEventTypeBookingFields,
} from "@calcom/lib/event-types/transformers";
import { slugify } from "@calcom/lib/slugify";
import type { EventTypeOutput } from "@calcom/platform-types";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

export function transformApiEventTypeForAtom(eventType: EventTypeOutput) {
  const { lengthInMinutes, locations, bookingFields, ...rest } = eventType;

  const slug = slugify(eventType.title);
  const isDefault = isDefaultEvent(rest.title);
  return {
    length: lengthInMinutes,
    locations: transformApiEventTypeLocations(locations),
    bookingFields: eventTypeBookingFields
      .brand<"HAS_SYSTEM_FIELDS">()
      .parse(transformApiEventTypeBookingFields(bookingFields)),
    slug,
    isDefault,
    ...rest,
  };
}

function isDefaultEvent(eventSlug: string) {
  const foundInDefaults = defaultEvents.find((obj) => {
    return obj.slug === eventSlug;
  });
  return !!foundInDefaults;
}
