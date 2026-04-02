import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkOnboardingRedirect } from "@calcom/features/auth/lib/onboardingUtils";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

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

  redirect("/event-types");
};

export default RedirectPage;
