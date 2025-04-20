import { cookies, headers } from "next/headers";
import React from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import Shell from "@calcom/features/shell/Shell";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import SettingsLayoutAppDirClient from "./(settings-layout)/SettingsLayoutAppDirClient";

export default async function SettingsLayout(props: { children: React.ReactNode }) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const currentOrg = null;
  const otherTeams = null;

  return (
    <Shell>
      <SettingsLayoutAppDirClient currentOrg={currentOrg} otherTeams={otherTeams}>
        {props.children}
      </SettingsLayoutAppDirClient>
    </Shell>
  );
}
