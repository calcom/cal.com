import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { generateEventBookingPageMetadata } from "app/generateBookingPageMetadata";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { EventRepository } from "@calcom/lib/server/repository/event";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/[type]/getServerSideProps";

import type { PageProps as TeamTypePageProps } from "~/team/type-view";
import TeamTypePage from "~/team/type-view";
import UserTypePage from "~/users/views/users-type-public-view";
import type { PageProps as UserTypePageProps } from "~/users/views/users-type-public-view";

export type OrgTypePageProps = UserTypePageProps | TeamTypePageProps;
const getData = withAppDirSsr<OrgTypePageProps>(getServerSideProps);

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(legacyCtx);

  const { booking, user: username, slug: eventSlug, isSEOIndexable, eventData, isBrandingHidden } = props;
  const rescheduleUid = booking?.uid;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(legacyCtx.req, legacyCtx.params?.orgSlug);

  const event = await EventRepository.getPublicEvent({
    username,
    eventSlug,
    isTeamEvent: !!(props as TeamTypePageProps)?.teamId,
    org: isValidOrgDomain ? currentOrgDomain : null,
    fromRedirectOfNonOrgLink: legacyCtx.query.orgRedirection === "true",
  });

  const profileName = event?.profile?.name ?? "";
  const profileImage = event?.profile.image ?? "";

  return await generateEventBookingPageMetadata({
    profile: { name: profileName, image: profileImage },
    event: {
      title: event?.title ?? "",
      hidden: event?.hidden ?? false,
      users: [
        ...(event?.users || []).map((user) => ({
          name: `${user.name}`,
          username: `${user.username}`,
        })),
      ],
    },
    hideBranding: isBrandingHidden,
    orgSlug: eventData?.entity.orgSlug ?? null,
    isSEOIndexable: !!isSEOIndexable,
    isReschedule: !!rescheduleUid,
  });
};

export const Page = async (props: OrgTypePageProps) => {
  if ((props as TeamTypePageProps)?.teamId) {
    return <TeamTypePage {...(props as TeamTypePageProps)} />;
  }
  return <UserTypePage {...(props as UserTypePageProps)} />;
};

export default WithLayout({ getLayout: null, getData, ServerPage: Page, isBookingPage: true });
