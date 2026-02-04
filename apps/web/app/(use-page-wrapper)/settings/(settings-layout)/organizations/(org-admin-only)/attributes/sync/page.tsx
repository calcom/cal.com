import { _generateMetadata, getTranslate } from "app/_utils";

import { getIntegrationAttributeSyncService } from "@calcom/features/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { PrismaAttributeRepository } from "@calcom/features/attributes/repositories/PrismaAttributeRepository";
import { prisma } from "@calcom/prisma";
import IntegrationAttributeSyncView from "@calcom/web/modules/integration-attribute-sync/components/IntegrationAttributeSyncView";

import { validateUserHasOrgPerms } from "../../../actions/validateUserHasOrgPerms";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("attribute_sync"),
    (t) => t("attribute_sync_description"),
    undefined,
    undefined,
    "/settings/organizations/attributes/sync"
  );

const Page = async () => {
  const t = await getTranslate();

  const session = await validateUserHasOrgPerms({
    permission: "organization.attributes.create",
    fallbackRoles: ["ADMIN", "OWNER"],
    redirectTo: "/settings/my-account/profile",
  });

  const organizationId = session.user.org.id;

  const integrationAttributeSyncService = getIntegrationAttributeSyncService();
  const teamRepository = new TeamRepository(prisma);
  const attributeRepo = new PrismaAttributeRepository(prisma);

  const [credentialData, integrationAttributeSyncs, organizationTeams, attributes] = await Promise.all([
    integrationAttributeSyncService.getEnabledAppCredentials(organizationId),
    integrationAttributeSyncService.getAllIntegrationAttributeSyncs(organizationId),
    teamRepository.findAllByParentId({
      parentId: organizationId,
      select: {
        id: true,
        name: true,
      },
    }),
    attributeRepo.findAllByOrgIdWithOptions({ orgId: organizationId }),
  ]);

  return (
    <SettingsHeader title={t("attribute_sync")} description={t("attribute_sync_description")}>
      <IntegrationAttributeSyncView
        credentialsData={credentialData}
        initialIntegrationAttributeSyncs={integrationAttributeSyncs}
        organizationTeams={organizationTeams}
        attributes={attributes}
        organizationId={organizationId}
      />
    </SettingsHeader>
  );
};

export default Page;
