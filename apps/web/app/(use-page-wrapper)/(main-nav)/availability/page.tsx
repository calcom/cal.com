import { _generateMetadata, getTranslate } from "app/_utils";
import { notFound } from "next/navigation";

// import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
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
  // const session = await getServerSessionForAppDir();
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
