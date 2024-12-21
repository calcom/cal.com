import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { headers, cookies } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/[user]/getServerSideProps";

import type { PageProps as LegacyPageProps } from "~/users/views/users-public-view";
import LegacyPage from "~/users/views/users-public-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const props = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));

  const { profile, markdownStrippedBio } = props;
  return await _generateMetadata(
    () => profile.name,
    () => markdownStrippedBio
  );
};

const getData = withAppDirSsr<LegacyPageProps>(getServerSideProps);
export default WithLayout({ getData, Page: LegacyPage })<"P">;
