import { withAppDirSsr } from "app/WithAppDirSsr";
import { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/org/[orgSlug]/[user]/getServerSideProps";

import type { PageProps as TeamPageProps } from "~/team/team-view";
import TeamPage from "~/team/team-view";
import UserPage from "~/users/views/users-public-view";
import type { PageProps as UserPageProps } from "~/users/views/users-public-view";

type OrgPageProps = UserPageProps | TeamPageProps;
const getData = withAppDirSsr<OrgPageProps>(getServerSideProps);

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(legacyCtx);

  if ((props as TeamPageProps)?.team) {
    return await _generateMetadata(
      (t) => props.team.name || t("nameless_team"),
      (t) => props.team.name || t("nameless_team")
    );
  }
  return await _generateMetadata(
    (t) => (props as UserPageProps).profile.name,
    (t) => (props as UserPageProps).markdownStrippedBio
  );
};

const Page = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);

  const props = await getData(legacyCtx);

  if ((props as TeamPageProps)?.team) {
    return <TeamPage {...(props as TeamPageProps)} />;
  }
  return <UserPage {...(props as UserPageProps)} />;
};
export default WithLayout({ getLayout: null, getData, ServerPage: Page });
