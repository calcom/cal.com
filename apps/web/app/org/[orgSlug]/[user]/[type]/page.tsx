import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { generateEventBookingPageMetadata } from "app/generateBookingPageMetadata";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

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

  const { booking, isSEOIndexable, eventData, isBrandingHidden } = props;
  const rescheduleUid = booking?.uid;

  const profileName = eventData?.profile?.name ?? "";
  const profileImage = eventData?.profile.image ?? "";

  return await generateEventBookingPageMetadata({
    profile: { name: profileName, image: profileImage },
    event: {
      title: eventData?.title ?? "",
      hidden: eventData?.hidden ?? false,
      users: [
        ...(eventData?.users || []).map((user) => ({
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
