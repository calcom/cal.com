import cookie from "cookie";
import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import isPrismaObj from "@calcom/lib/isPrismaObj";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { getUtmParamsFromCookie } from "@calcom/lib/utm";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

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

  //save utm params from cookie to user.metadata.utm if exists and not already set
  //required for tracking utm tracking from oauth signup

  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    if (cookies.utm_params) {
      const utmParamsObj = getUtmParamsFromCookie(cookies.utm_params);
      user.metadata = {
        ...(typeof user.metadata === "object" && user.metadata !== null ? user.metadata : {}),
        utm: utmParamsObj,
      };
      await userRepo.updateWhereId({
        whereId: user.id,
        data: {
          metadata: user.metadata as Prisma.InputJsonValue,
        },
      });
    }
  } catch (e) {
    console.error("Error parsing utm_params cookie", e);
  }
  let currentOnboardingStep: string | undefined = undefined;

  //find if cookie "utm_params" exists

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
    await prisma.user.update({
      where: { id: session.user.id },
      data: { metadata: { google_signup_tracked: true } },
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
