import { _generateMetadata, getTranslate } from "app/_utils";
// import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

// import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
// import { buildLegacyRequest } from "@lib/buildLegacyCtx";
// import { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import AvailabilityPage, { AvailabilityCTA } from "~/availability/availability-view";

import { ShellMainAppDir } from "../ShellMainAppDir";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("availability"),
    (t) => t("configure_availability")
  );
};

const Page = async () => {
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
    const t = await getTranslate();
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
