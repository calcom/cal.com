import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkOnboardingRedirect } from "@calcom/features/auth/lib/onboardingUtils";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";

import { MateuszWrapper } from "./MateuszWrapper";

const Page = async ({ searchParams }: PageProps): Promise<ReactElement> => {
  const _searchParams = await searchParams;
  const _headers = await headers();
  const _cookies = await cookies();

  const session = await getServerSession({
    req: buildLegacyRequest(_headers, _cookies),
  });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  // Check if user needs onboarding and redirect before showing page
  const organizationId = session.user.profile?.organizationId ?? null;
  const onboardingPath = await checkOnboardingRedirect(session.user.id, {
    checkEmailVerification: true,
    organizationId,
  });
  if (onboardingPath) {
    return redirect(onboardingPath);
  }

  return <MateuszWrapper />;
};

export const generateMetadata = async (): Promise<
  ReturnType<typeof _generateMetadata>
> =>
  await _generateMetadata(
    (_t) => "Mateusz Dashboard",
    (_t) => "A comprehensive UI showcase with interactive elements",
    undefined,
    undefined,
    "/mateusz"
  );

export default Page;
