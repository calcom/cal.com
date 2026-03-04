import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkOnboardingRedirect } from "@calcom/features/auth/lib/onboardingUtils";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const RedirectPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  // Check if user needs onboarding and redirect before going to event-types
  const organizationId = session.user.profile?.organizationId ?? null;
  const onboardingPath = await checkOnboardingRedirect(session.user.id, {
    checkEmailVerification: true,
    organizationId,
  });
  if (onboardingPath) {
    redirect(onboardingPath);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { metadata: true },
  });
  const metadata = userMetadata.parse(user?.metadata);
  const defaultView = metadata?.defaultHomeView || "event-types";
  redirect(`/${defaultView}`);
};

export default RedirectPage;
