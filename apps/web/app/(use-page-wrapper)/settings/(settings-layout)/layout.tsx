import dynamic from "next/dynamic";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import type { SettingsLayoutProps } from "@calcom/features/settings/appDir/SettingsLayoutAppDirClient";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";

const SettingsLayoutAppDirClient = dynamic(
  () => import("@calcom/features/settings/appDir/SettingsLayoutAppDirClient"),
  {
    ssr: false,
  }
);

type SettingsLayoutAppDir = Omit<SettingsLayoutProps, "currentOrg" | "otherTeams">;

export default async function SettingsLayoutAppDir(props: SettingsLayoutAppDir) {
  const session = await getServerSessionForAppDir();
  const userId = session?.user?.id ?? -1;
  const orgId = session?.user?.org?.id ?? -1;
  let currentOrg = null;
  let otherTeams = null;

  try {
    currentOrg = await OrganizationRepository.findCurrentOrg({ userId, orgId });
  } catch (err) {}

  try {
    otherTeams = await OrganizationRepository.findTeamsInOrgIamNotPartOf({
      userId,
      parentId: orgId,
    });
  } catch (err) {}

  return <SettingsLayoutAppDirClient {...props} currentOrg={currentOrg} otherTeams={otherTeams} />;
}
