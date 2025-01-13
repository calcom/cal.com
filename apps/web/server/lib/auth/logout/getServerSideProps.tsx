import type { GetServerSidePropsContext } from "next";

import { ssrInit } from "@server/lib/ssr";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
      query: context.query,
    },
  };
}
