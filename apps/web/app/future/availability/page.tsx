import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { AUTH_OPTIONS } from "@calcom/features/auth/lib/next-auth-options";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";

import AvailabilityPage from "~/availability/availability-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("availability"),
    (t) => t("configure_availability")
  );
};

const Page = async () => {
  const session = await getServerSession(AUTH_OPTIONS);
  const userId = session?.user?.id;
  const orgId = session?.user?.org?.id;
  if (!userId || !orgId) {
    notFound();
  }

  try {
    const currentOrg = await OrganizationRepository.findCurrentOrg({
      orgId,
      userId,
    });
    return <AvailabilityPage currentOrg={currentOrg} />;
  } catch {
    notFound();
  }
};

export default WithLayout({ ServerPage: Page });
