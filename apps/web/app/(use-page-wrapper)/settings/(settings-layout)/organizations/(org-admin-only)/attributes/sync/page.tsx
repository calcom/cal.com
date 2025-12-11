import { _generateMetadata } from "app/_utils";

import IntegrationAttributeSyncView from "@calcom/features/ee/integration-attribute-sync/IntegrationAttributeSyncView";
import { getIntegrationAttributeSyncService } from "@calcom/features/ee/integration-attribute-sync/di/IntegrationAttributeSyncService.container";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { PrismaAttributeRepository } from "@calcom/lib/server/repository/PrismaAttributeRepository";
import { prisma } from "@calcom/prisma";

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
  // PBAC permission check - redirect if user doesn't have permission
  const session = await validateUserHasOrgPerms({
    permission: "organization.attributes.create",
    fallbackRoles: ["ADMIN", "OWNER"],
    redirectTo: "/settings/my-account/profile",
  });

  const organizationId = session.user.org.id;

  // Initialize repositories and services
  const integrationAttributeSyncService = getIntegrationAttributeSyncService();
  const teamRepository = new TeamRepository(prisma);
  const attributeRepo = new PrismaAttributeRepository(prisma);

  // Fetch all data in parallel for better performance
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
    <SettingsHeader title="Attribute Sync" description="Setup attribute syncing with 3rd party integrations">
      <IntegrationAttributeSyncView
        credentialsData={credentialData}
        integrationAttributeSyncs={integrationAttributeSyncs}
        organizationTeams={organizationTeams}
        attributes={attributes}
      />
    </SettingsHeader>
  );
};

export default Page;
