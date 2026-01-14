import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import isPrismaObj from "@calcom/lib/isPrismaObj";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";

import { isPrismaObjOrUndefined } from "@lib/isPrismaObj";

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
    return "IN";
  }
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req } = context;

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

  let google_signup_to_be_tracked = false;
  const has_google_signup_tracked = !user.metadata?.hasOwnProperty("google_signup_tracked");

  const hasNotStartedOnboarding = !user.metadata?.hasOwnProperty("currentOnboardingStep");

  let google_signup_tracked = false;
  if (user.metadata && typeof user.metadata === "object" && !Array.isArray(user.metadata)) {
    google_signup_tracked = !("google_signup_tracked" in user.metadata)
      ? false
      : !user.metadata.google_signup_tracked;
  }

  if (
    user.identityProvider === "GOOGLE" &&
    (!user.metadata || (has_google_signup_tracked && hasNotStartedOnboarding) || google_signup_tracked)
  ) {
    google_signup_to_be_tracked = true;
    const existingMetadata = (isPrismaObjOrUndefined(user.metadata) as Record<string, unknown>) || {};
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        metadata: {
          ...existingMetadata,
          google_signup_tracked: true,
        },
      },
    });
  }

  const country = await getRequestCountryOrigin(req); // Default to IN if country not found
  return {
    props: {
      hasPendingInvites: user.teams.find((team) => team.accepted === false) ?? false,
      country,
      email: user.email,
      userId: user.id,
      google_signup_to_be_tracked,
      has_google_signup_tracked,
      hasCompletedOnboarding: hasNotStartedOnboarding,
      google_signup_tracked,
      metadata: user.metadata,
      identityProvider: user.identityProvider,
    },
  };
};
