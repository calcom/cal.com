import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
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
  } = props;
  const { t } = useLocale();
  const { data: event } = trpc.viewer.public.event.useQuery(
    {
      username,
      eventSlug,
      isTeamEvent,
      org: entity.orgSlug ?? null,
      fromRedirectOfNonOrgLink: entity.fromRedirectOfNonOrgLink,
    },
    { refetchOnWindowFocus: false }
  );

  const profileName = event?.profile.name ?? "";
  const profileImage = event?.profile.image;
  const title = event?.title ?? "";
  return (
    <HeadSeo
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
