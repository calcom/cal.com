import { type Params } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { notFound } from "next/navigation";
import { z } from "zod";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { OrgForm } from "@calcom/features/ee/organizations/pages/settings/admin/AdminOrgEditPage";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";

const orgIdSchema = z.object({ id: z.coerce.number() });

export const generateMetadata = async (props: { params: Promise<Params> }) => {
  const params = await props.params;
  const input = orgIdSchema.safeParse(params);
  if (!input.success) {
    return await _generateMetadata(
      () => `Editing organization`,
      () => "Here you can edit an organization."
    );
  }

  const org = await OrganizationRepository.adminFindById({ id: input.data.id });

  return await _generateMetadata(
    () => `Editing organization: ${org.name}`,
    () => "Here you can edit an organization."
  );
};

const Page = async (props: { params: Promise<Params> }) => {
  const params = await props.params;
  const input = orgIdSchema.safeParse(params);

  if (!input.success) notFound();

  try {
    const org = await OrganizationRepository.adminFindById({ id: input.data.id });

    return (
      <SettingsHeader
        title={`Editing organization: ${org.name}`}
        description="Here you can edit an organization.">
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
