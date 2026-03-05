import { clearSessionCache, getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { isCompanyEmail } from "@calcom/features/ee/organizations/lib/utils";
import { APP_NAME } from "@calcom/lib/constants";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { CompanyEmailRequired } from "~/onboarding/organization/details/company-email-required-view";
import { OrganizationDetailsView } from "~/onboarding/organization/details/organization-details-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("organization_details")}`,
    () => "",
    true,
    undefined,
    "/onboarding/organization/details"
  );
};

const ServerPage = async (props: { searchParams: Promise<{ sessionClear?: string }> }) => {
  const searchParams = await props.searchParams;
  const req = buildLegacyRequest(await headers(), await cookies());
  let session = await getServerSession({ req });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  if (searchParams.sessionClear) {
    clearSessionCache();
    session = await getServerSession({ req });
  }

  const userEmail = session?.user?.email || "";

  if (!isCompanyEmail(userEmail)) {
    return <CompanyEmailRequired userEmail={userEmail} />;
  }

  return <OrganizationDetailsView userEmail={userEmail} />;
};

export default ServerPage;
