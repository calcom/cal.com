import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import isPrismaObj from "@calcom/lib/isPrismaObj";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";

async function getRequestCountryOrigin(
  req: import("http").IncomingMessage & { cookies: Partial<{ [key: string]: string }> }
) {
  try {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string" ? forwarded.split(",")[0] : req.socket?.remoteAddress;

    const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
    const geoData = await geoRes.json();
    const country = geoData.country || "IN";

    return country;
  } catch {
    return null;
  }
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req } = context;
  const country = await getRequestCountryOrigin(req); // Default to IN if country not found

  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const userRepo = new UserRepository(prisma);
  const user = await userRepo.findUserTeams({
    id: session.user.id,
  });

  if (!user) {
    throw new Error("User from session not found");
  }

  let currentOnboardingStep: string | undefined = undefined;

  console.log(
    "Can redirect: ",
    user,
    " and ",
    context.params?.step == undefined && user.metadata
    // isPrismaObj(user.metadata) &&
    // user.metadata.hasOwnProperty("currentOnboardingStep")
  );

  //to handle the case where the user has already reached a step in the onboarding process
  if (
    context.params?.step == undefined &&
    user.metadata &&
    isPrismaObj(user.metadata) &&
    user.metadata.hasOwnProperty("currentOnboardingStep")
  ) {
    currentOnboardingStep = user.metadata.currentOnboardingStep as string | undefined;
    if (currentOnboardingStep) {
      return { redirect: { permanent: true, destination: `/getting-started/${currentOnboardingStep}` } };
    }
  }

  return {
    props: {
      hasPendingInvites: user.teams.find((team) => team.accepted === false) ?? false,
      country,
    },
  };
};
