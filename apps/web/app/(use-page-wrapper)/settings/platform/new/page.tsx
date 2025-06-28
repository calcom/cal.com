import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { WEBAPP_URL } from "@calcom/lib/constants";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import LegacyPage, { LayoutWrapper } from "~/settings/platform/new/create-new-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("set_up_your_platform_organization"),
    (t) => t("platform_organization_description"),
    undefined,
    undefined,
    "/settings/platform/new"
  );

const ServerPage = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const callbackUrl = `${WEBAPP_URL}/settings/platform/new`;

  if (!session?.user) {
    redirect(`/login?callbackUrl=${callbackUrl}`);
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
