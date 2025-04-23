import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import type { SettingsLayoutProps } from "./SettingsLayoutAppDirClient";
import SettingsLayoutAppDirClient from "./SettingsLayoutAppDirClient";

type SettingsLayoutAppDirProps = Omit<SettingsLayoutProps, "currentOrg" | "otherTeams">;

export default async function SettingsLayoutAppDir(props: SettingsLayoutAppDirProps) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/auth/login");
  }

  return (
    <>
      <SettingsLayoutAppDirClient {...props} />
    </>
  );
}
