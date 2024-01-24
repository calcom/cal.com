import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { headers, cookies } from "next/headers";

import { getLayout } from "@calcom/features/MainLayoutAppDir";

import { getServerSideProps, type UserPageProps } from "@lib/[user]/getServerSideProps";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import LegacyPage from "@components/pages/[user]";

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Record<string, string | string[]>;
  searchParams: { [key: string]: string | string[] | undefined };
}) => {
  const props = await getData(
    buildLegacyCtx(headers(), cookies(), params, searchParams) as unknown as GetServerSidePropsContext
  );

  const { profile, markdownStrippedBio } = props;
  return await _generateMetadata(
    () => profile.name,
    () => markdownStrippedBio
  );
};

const getData = withAppDirSsr<UserPageProps>(getServerSideProps);
export default WithLayout({ getLayout, getData, Page: LegacyPage })<"P">;
