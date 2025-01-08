import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { WithLayout } from "app/layoutHOC";
import { type OrgTypePageProps } from "app/org/[orgSlug]/[user]/[type]/page";

import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/[type]/getServerSideProps";

import type { PageProps as TeamTypePageProps } from "~/team/type-view";
import TeamTypePage from "~/team/type-view";
import UserTypePage from "~/users/views/users-type-public-view";
import type { PageProps as UserTypePageProps } from "~/users/views/users-type-public-view";

const getEmbedData = withEmbedSsrAppDir<OrgTypePageProps>(getServerSideProps);

const Page = async (props: OrgTypePageProps) => {
  if ((props as TeamTypePageProps)?.teamId) {
    return <TeamTypePage {...(props as TeamTypePageProps)} />;
  }
  return <UserTypePage {...(props as UserTypePageProps)} />;
};

export default WithLayout({ getLayout: null, getData: getEmbedData, isBookingPage: true, ServerPage: Page });
