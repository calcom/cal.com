import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

const querySchema = z.object({
  uid: z.string(),
});

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const parsedQuery = querySchema.safeParse(context.query);

  if (!parsedQuery.success) return { notFound: true } as const;

  const localStorageUid = parsedQuery.data.uid;

  return {
    props: {
      localStorageUid,
    },
  };
}
