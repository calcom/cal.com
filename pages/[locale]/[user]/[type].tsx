/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { GetStaticPaths, GetStaticPropsContext } from "next";

import { useSearchParams } from "@lib/hooks/useSearchParams";
import { inferQueryOutput, trpc } from "@lib/trpc";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import Loader from "@components/Loader";
import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

import { ssgInit } from "@server/ssg";

type TEventTypeByUsername = NonNullable<inferQueryOutput<"booking.eventTypeByUsername">>;

export type AvailabilityPageProps = TEventTypeByUsername;

export default function Type(props: inferSSRProps<typeof getStaticProps>) {
  const searchParams = useSearchParams();
  const username = (props.username || searchParams.username) as string;
  const slug = (props.slug || searchParams.slug) as string;

  const query = trpc.useQuery(["booking.eventTypeByUsername", { username, slug }], {
    enabled: !!username && !!slug,
  });
  if (!query.data) {
    return <Loader />;
  }
  return <AvailabilityPage {...query.data} />;
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: true,
  };
};

export async function getStaticProps(
  context: GetStaticPropsContext<{ user: string; type: string; locale: string }>
) {
  const ssg = await ssgInit(context);
  const username = context.params!.user;
  const slug = context.params!.type;
  const data = await ssg.fetchQuery("booking.eventTypeByUsername", { username, slug });
  if (!data) {
    return {
      notFound: true,
    };
  }
  return {
    props: {
      username,
      slug,
      trpcState: ssg.dehydrate(),
      revalidate: 1,
    },
  };
}
