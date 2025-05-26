import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { UserRepository } from "@calcom/lib/server/repository/user";

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req } = context;

  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await UserRepository.findUserTeams({
    id: session.user.id,
  });

  if (!user) {
    throw new Error("User from session not found");
  }

  return {
    props: {
      hasPendingInvites: user.teams.find((team) => team.accepted === false) ?? false,
    },
  };
};
