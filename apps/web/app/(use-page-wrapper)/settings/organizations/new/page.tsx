import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { isCompanyEmail } from "@calcom/features/ee/organizations/lib/utils";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import LicenseRequired from "~/ee/common/components/LicenseRequired";
import LegacyPage, { LayoutWrapper } from "~/ee/organizations/new/create-new-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("set_up_your_organization"),
    (t) => t("organizations_description"),
    undefined,
    undefined,
    "/settings/organizations/new"
  );

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const isAdmin = session.user.role === UserPermissionRole.ADMIN;
  const userEmail = session.user.email || "";

  if (!isAdmin && !isCompanyEmail(userEmail)) {
    return redirect("/settings/my-account/profile");
  }

  return (
    <LayoutWrapper>
      <LicenseRequired>
        <LegacyPage />
      </LicenseRequired>
    </LayoutWrapper>
  );
};

export default ServerPage;
