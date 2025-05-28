import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

export type PageProps = inferSSRProps<typeof getServerSideProps>;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession({ req: context.req });
  const { timeZone } = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      timeZone: true,
    },
  });

  return {
    props: {
      timeZone,
    },
  };
}
