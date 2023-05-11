import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { HeadSeo } from "@calcom/ui";

interface BookerSeoProps {
  username: string;
  eventSlug: string;
  rescheduleUid: string | undefined;
  hideBranding?: boolean;
}

export const BookerSeo = (props: BookerSeoProps) => {
  const { eventSlug, username, rescheduleUid, hideBranding } = props;
  const { t } = useLocale();
  const { data: event } = trpc.viewer.public.event.useQuery(
    { username, eventSlug },
    { refetchOnWindowFocus: false }
  );

  const profileName = event?.profile?.name ?? "";
  const profileImage = event?.profile?.image;
  const title = event?.title ?? "";
  return (
    <HeadSeo
      title={`${rescheduleUid ? t("reschedule") : ""} ${title} | ${profileName}`}
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
        nofollow: event?.hidden,
        noindex: event?.hidden,
      }}
      isBrandingHidden={hideBranding}
    />
  );
};
