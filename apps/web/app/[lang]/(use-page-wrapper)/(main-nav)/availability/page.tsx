import { ShellMainAppDir } from "app/[lang]/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
// import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

// import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
// import { buildLegacyRequest } from "@lib/buildLegacyCtx";
// import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import AvailabilityPage, { AvailabilityCTA } from "~/availability/availability-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang as string);

  return await _generateMetadata(t("availability"), t("configure_availability"));
};

const Page = async ({ params }: PageProps) => {
  // const session = await getServerSession({ req: buildLegacyRequest(headers(), cookies()) });
  // const userId = session?.user?.id;
  // const orgId = session?.user?.org?.id;
  // if (!userId || !orgId) {
  //   notFound();
  // }

  try {
    // const currentOrg = await OrganizationRepository.findCurrentOrg({
    //   orgId,
    //   userId,
    // });
    const t = await getTranslate(params.lang as string);
    return (
      <ShellMainAppDir
        heading={t("availability")}
        subtitle={t("configure_availability")}
        CTA={<AvailabilityCTA />}>
        <AvailabilityPage />
      </ShellMainAppDir>
    );
  } catch {
    notFound();
  }
};

export default Page;
