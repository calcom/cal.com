import { defaultEvents } from "@calcom/lib/defaultEvents";
import {
  transformApiEventTypeLocations,
  transformApiEventTypeBookingFields,
} from "@calcom/lib/event-types/transformers";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { EventTypeOutput } from "@calcom/platform-types";
import type { BookerLayoutSettings } from "@calcom/prisma/zod-utils";
import { BookerLayouts, bookerLayoutOptions, eventTypeBookingFields } from "@calcom/prisma/zod-utils";
import {
  bookerLayouts as bookerLayoutsSchema,
  userMetadata as userMetadataSchema,
} from "@calcom/prisma/zod-utils";

export function transformApiEventTypeForAtom(eventType: EventTypeOutput) {
  const { lengthInMinutes, locations, bookingFields, ...rest } = eventType;

  const isDefault = isDefaultEvent(rest.title);

  const defaultEventBookerLayouts = {
    enabledLayouts: [...bookerLayoutOptions],
    defaultLayout: BookerLayouts.MONTH_VIEW,
  } as BookerLayoutSettings;
  const firstUsersMetadata = userMetadataSchema.parse(rest.users[0].metadata || {});
  const bookerLayouts = bookerLayoutsSchema.parse(
    firstUsersMetadata?.defaultBookerLayouts || defaultEventBookerLayouts
  );

  return {
    length: lengthInMinutes,
    locations: transformApiEventTypeLocations(locations),
    bookingFields: eventTypeBookingFields
      .brand<"HAS_SYSTEM_FIELDS">()
      .parse(transformApiEventTypeBookingFields(bookingFields)),
    ...rest,
    isDefault,
    isDynamic: false,
    profile: {
      username: rest.users[0].username,
      name: rest.users[0].name,
      weekStart: rest.users[0].weekStart,
      image: getUserAvatarUrl({
        avatarUrl: rest.users[0].avatarUrl,
      }),
      brandColor: rest.users[0].brandColor,
      darkBrandColor: rest.users[0].darkBrandColor,
      theme: null,
      bookerLayouts,
    },
    entity: {
      fromRedirectOfNonOrgLink: true,
      considerUnpublished: false,
      orgSlug: null,
      teamSlug: null,
      name: undefined,
    },
    hosts: [],
  };
}

function isDefaultEvent(eventSlug: string) {
  const foundInDefaults = defaultEvents.find((obj) => {
    return obj.slug === eventSlug;
  });
  return !!foundInDefaults;
}
