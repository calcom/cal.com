import { defaultEvents } from "@calcom/lib/defaultEvents";
import {
  transformApiEventTypeLocations,
  transformApiEventTypeBookingFields,
} from "@calcom/lib/event-types/transformers";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import type { EventTypeOutput } from "@calcom/platform-types";
import {
  bookerLayoutOptions,
  eventTypeBookingFields,
  BookerLayouts,
  bookerLayouts as bookerLayoutsSchema,
  userMetadata as userMetadataSchema,
} from "@calcom/prisma/zod-utils";

export function transformApiEventTypeForAtom(eventType: EventTypeOutput) {
  const { lengthInMinutes, locations, bookingFields, users, ...rest } = eventType;

  const isDefault = isDefaultEvent(rest.title);

  const defaultEventBookerLayouts = {
    enabledLayouts: [...bookerLayoutOptions],
    defaultLayout: BookerLayouts.MONTH_VIEW,
  };
  const firstUsersMetadata = userMetadataSchema.parse(users[0].metadata || {});
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
      username: users[0].username,
      name: users[0].name,
      weekStart: users[0].weekStart,
      image: getUserAvatarUrl({
        avatarUrl: users[0].avatarUrl,
      }),
      brandColor: users[0].brandColor,
      darkBrandColor: users[0].darkBrandColor,
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
    users: users.map((user) => ({
      ...user,
      metadata: undefined,
      bookerUrl: getBookerBaseUrlSync(null),
      profile: {
        username: user.username || "",
        name: user.name,
        weekStart: user.weekStart,
        image: getUserAvatarUrl({
          avatarUrl: user.avatarUrl,
        }),
        brandColor: user.brandColor,
        darkBrandColor: user.darkBrandColor,
        theme: null,
        organization: null,
        id: user.id,
        organizationId: null,
        userId: user.id,
        upId: `usr-${user.id}`,
      },
    })),
  };
}

function isDefaultEvent(eventSlug: string) {
  const foundInDefaults = defaultEvents.find((obj) => {
    return obj.slug === eventSlug;
  });
  return !!foundInDefaults;
}
