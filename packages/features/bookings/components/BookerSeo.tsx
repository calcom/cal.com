import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import type { getPublicEvent } from "@calcom/features/eventtypes/lib/getPublicEvent";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { HeadSeo } from "@calcom/ui";

interface BookerSeoProps {
  username: string;
  eventSlug: string;
  rescheduleUid: string | undefined;
  hideBranding?: boolean;
  isSEOIndexable?: boolean;
  isTeamEvent?: boolean;
  eventData?: Omit<
    Pick<NonNullable<Awaited<ReturnType<typeof getPublicEvent>>>, "profile" | "title" | "users" | "hidden">,
    "profile"
  > & {
    profile: {
      image: string | undefined;
      name: string | null;
      username: string | null;
    };
  };
  entity: {
    fromRedirectOfNonOrgLink: boolean;
    orgSlug?: string | null;
    teamSlug?: string | null;
    name?: string | null;
  };
  bookingData?: GetBookingType | null;
}

export const BookerSeo = (props: BookerSeoProps) => {
  const {
    eventSlug,
    username,
    rescheduleUid,
    hideBranding,
    isTeamEvent,
    entity,
    isSEOIndexable,
    bookingData,
    eventData,
  } = props;
  const { t } = useLocale();
  const { data: _event } = trpc.viewer.public.event.useQuery(
    {
      username,
      eventSlug,
      isTeamEvent,
      org: entity.orgSlug ?? null,
      fromRedirectOfNonOrgLink: entity.fromRedirectOfNonOrgLink,
    },
    { refetchOnWindowFocus: false, enabled: !eventData }
  );
  const event = eventData ?? _event;

  const profileName = event?.profile.name ?? "";
  const profileImage = event?.profile.image;
  const title = event?.title ?? "";
  return (
    <HeadSeo
      origin={getOrgFullOrigin(entity.orgSlug ?? null)}
      title={`${rescheduleUid && !!bookingData ? t("reschedule") : ""} ${title} | ${profileName}`}
      description={`${rescheduleUid ? t("reschedule") : ""} ${title}`}
      meeting={{
        title: title,
        profile: { name: profileName, image: profileImage },
        users: [
          ...(event?.users || []).map((user) => ({
            name: `${user.name}`,
            username: `${user.username}`,
          })),
        ],
      }}
      nextSeoProps={{
        nofollow: event?.hidden || !isSEOIndexable,
        noindex: event?.hidden || !isSEOIndexable,
      }}
      isBrandingHidden={hideBranding}
    />
  );
};
