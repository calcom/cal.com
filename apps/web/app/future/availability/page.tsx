import { _generateMetadata } from "app/_utils";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";

import { AUTH_OPTIONS } from "@calcom/features/auth/lib/next-auth-options";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";

import PageWrapper from "@components/PageWrapperAppDir";

import AvailabilityPage from "~/availability/availability-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("availability"),
    (t) => t("configure_availability")
  );
};

const Page = async () => {
  const h = headers();
  const nonce = h.get("x-nonce") ?? undefined;
  const session = await getServerSession(AUTH_OPTIONS);
  const userId = session?.user?.id ?? -1;
  const orgId = session?.user?.org?.id ?? -1;

  const currentOrg = await OrganizationRepository.findCurrentOrg({
    orgId,
    userId,
  });
  return (
    <PageWrapper
      getLayout={null}
      requiresLicense={false}
      nonce={nonce}
      themeBasis={null}
      isBookingPage={false}>
      <AvailabilityPage currentOrg={currentOrg} />
    </PageWrapper>
  );
};

export default Page;
