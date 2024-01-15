import LegacyPage, { getServerSideProps } from "@pages/[user]";
import { withAppDir } from "app/AppDirSSRHOC";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { headers, cookies } from "next/headers";

import { getLayout } from "@calcom/features/MainLayoutAppDir";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

export const generateMetadata = async ({ params }: { params: Record<string, string | string[]> }) => {
  const ssrResponse = await getServerSideProps(
    buildLegacyCtx(headers(), cookies(), params) as unknown as GetServerSidePropsContext
  );

  if (
    "props" in ssrResponse &&
    "profile" in ssrResponse.props &&
    "markdownStrippedBio" in ssrResponse.props
  ) {
    const { profile, markdownStrippedBio } = ssrResponse.props;
    return await _generateMetadata(
      () => profile.name,
      () => markdownStrippedBio
    );
  }

  return await _generateMetadata(
    () => "",
    () => ""
  );
};

export default WithLayout({ getLayout, getData: withAppDir(getServerSideProps), Page: LegacyPage })<"P">;
