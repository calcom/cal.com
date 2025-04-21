import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import React from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { OrganizationRepository } from "@calcom/lib/server/repository/organization";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import type { SettingsLayoutProps } from "./SettingsLayoutAppDirClient";
import SettingsLayoutAppDirClient from "./SettingsLayoutAppDirClient";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("settings"),
    (t) => t("settings_home_description"),
    undefined,
    undefined,
    "/settings"
  );

type SettingsLayoutAppDirProps = Omit<SettingsLayoutProps, "currentOrg" | "otherTeams">;

export default async function SettingsLayoutAppDir(props: SettingsLayoutAppDirProps) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

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

  return (
    <>
      <SettingsLayoutAppDirClient {...props} currentOrg={currentOrg} otherTeams={otherTeams} />;
    </>
  );
}
