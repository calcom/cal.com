import { type Params } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { z } from "zod";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { OrgForm } from "@calcom/features/ee/organizations/pages/settings/admin/AdminOrgEditPage";
import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

const orgIdSchema = z.object({ id: z.coerce.number() });

export const generateMetadata = async ({ params }: { params: Params }) => {
  const organizationRepository = getOrganizationRepository();
  const input = orgIdSchema.safeParse(await params);
  if (!input.success) {
    return await _generateMetadata(
      (t) => t("editing_org"),
      (t) => t("admin_orgs_edit_description"),
      undefined,
      undefined,
      "/settings/admin/organizations/edit"
    );
  }

  const org = await organizationRepository.adminFindById({ id: input.data.id });

  return await _generateMetadata(
    (t) => `${t("editing_org")}: ${org.name}`,
    (t) => t("admin_orgs_edit_description"),
    undefined,
    undefined,
    `/settings/admin/organizations/${input.data.id}/edit`
  );
};

const Page = async ({ params }: { params: Params }) => {
  const organizationRepository = getOrganizationRepository();
  const input = orgIdSchema.safeParse(await params);

  if (!input.success) throw new Error("Invalid access");

  const org = await organizationRepository.adminFindById({ id: input.data.id });
  const t = await getTranslate();
  return (
    <SettingsHeader title={`${t("editing_org")}: ${org.name}`} description={t("admin_orgs_edit_description")}>
      <LicenseRequired>
        <OrgForm org={org} />
      </LicenseRequired>
    </SettingsHeader>
  );
};

export default Page;
