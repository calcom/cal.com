import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";

export type PageProps = inferSSRProps<typeof getServerSidePropsForMembers>;

export const getServerSidePropsForMembers = async function getServerSidePropsForMembers({
  req,
}: GetServerSidePropsContext) {
  const session = await getServerSession({ req });

  if (!session || !session.user) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }

  if (!session.user.profile?.organizationId) {
    return {
      redirect: {
        permanent: false,
        destination: "/enterprise",
      },
    };
  }

  return {
    props: {},
  };
};
