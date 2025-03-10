import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { notFound } from "next/navigation";
import { z } from "zod";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { OrgForm } from "@calcom/features/ee/organizations/pages/settings/admin/AdminOrgEditPage";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";

const orgIdSchema = z.object({ id: z.coerce.number() });

export const generateMetadata = async ({ params }: PageProps) => {
  const input = orgIdSchema.safeParse(params);
  const t = await getTranslate(params.lang);
  if (!input.success) {
    return await _generateMetadata(t("editing_org"), t("admin_orgs_edit_description"));
  }

  const org = await OrganizationRepository.adminFindById({ id: input.data.id });

  return await _generateMetadata(`${t("editing_org")}: ${org.name}`, t("admin_orgs_edit_description"));
};

const Page = async ({ params }: PageProps) => {
  const input = orgIdSchema.safeParse(params);

  if (!input.success) notFound();

  try {
    const org = await OrganizationRepository.adminFindById({ id: input.data.id });
    const t = await getTranslate(params.lang);
    return (
      <SettingsHeader
        title={`${t("editing_org")}: ${org.name}`}
        description={t("admin_orgs_edit_description")}>
        <LicenseRequired>
          <OrgForm org={org} />
        </LicenseRequired>
      </SettingsHeader>
    );
  } catch {
    notFound();
  }
};

export default Page;
