import type { GetServerSidePropsContext } from "next";

import PageWrapper, { type CalPageWrapper } from "@components/PageWrapper";

import { ssrInit } from "@server/lib/ssr";

import NoMeetingFound from "~/videos/views/videos-no-meeting-found-single-view";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

const NoMeetingFoundPage = NoMeetingFound as unknown as CalPageWrapper;

NoMeetingFoundPage.PageWrapper = PageWrapper;

export default NoMeetingFoundPage;
