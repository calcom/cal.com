import LegacyPage, { getServerSideProps, type UserPageProps } from "@pages/[user]";
import { withAppDir } from "app/AppDirSSRHOC";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { headers, cookies } from "next/headers";

import { getLayout } from "@calcom/features/MainLayoutAppDir";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

export const generateMetadata = async ({ params }: { params: Record<string, string | string[]> }) => {
  const props = await getData(
    buildLegacyCtx(headers(), cookies(), params) as unknown as GetServerSidePropsContext
  );

  const { profile, markdownStrippedBio } = props;
  return await _generateMetadata(
    () => profile.name,
    () => markdownStrippedBio
  );
};

export const getData = withAppDir<UserPageProps>(getServerSideProps);
export default WithLayout({ getLayout, getData, Page: LegacyPage })<"P">;
