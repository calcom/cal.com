import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { isCompanyEmail } from "@calcom/features/ee/organizations/lib/utils";
import { APP_NAME } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

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

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const userEmail = session.user.email || "";

  if (!isCompanyEmail(userEmail)) {
    return <CompanyEmailRequired userEmail={userEmail} />;
  }

  return <OrganizationDetailsView userEmail={userEmail} />;
};

export default ServerPage;
