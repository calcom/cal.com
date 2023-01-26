import { GetServerSidePropsContext } from "next";

import { inferSSRProps } from "@lib/types/inferSSRProps";
import { EmbedProps } from "@lib/withEmbedSsr";

import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

import { ssgInit } from "@server/lib/ssg";
import { ssrInit } from "@server/lib/ssr";

export type AvailabilityTeamPageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

export default function TeamType(props: AvailabilityTeamPageProps) {
  return <AvailabilityPage {...props} />;
}
TeamType.isThemeSupported = true;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  await ssr.viewer.public.bookingPage.fetch(bookingPageQuerySchema.parse(context.params));

  return {
    props: {
      trpcState: ssg.dehydrate(),
    },
  };
};
