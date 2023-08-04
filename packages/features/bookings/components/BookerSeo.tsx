import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HeadSeo } from "@calcom/ui";

import { useEvent } from "../Booker/utils/event";

interface BookerSeoProps {
  username: string;
  eventSlug: string;
  rescheduleUid: string | undefined;
  hideBranding?: boolean;
  isTeamEvent?: boolean;
  entity: {
    orgSlug?: string | null;
    teamSlug?: string | null;
    name?: string | null;
  };
}

export const BookerSeo = (props: BookerSeoProps) => {
  const { eventSlug, username, rescheduleUid, hideBranding, isTeamEvent = false, entity } = props;
  const { t } = useLocale();
  const { data: event } = useEvent({
    username,
    eventSlug,
    isTeamEvent,
    org: entity.orgSlug,
  });

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
