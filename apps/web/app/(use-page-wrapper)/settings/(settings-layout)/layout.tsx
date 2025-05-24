import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { AppFlags } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import type { SettingsLayoutProps } from "./SettingsLayoutAppDirClient";
import SettingsLayoutAppDirClient from "./SettingsLayoutAppDirClient";

export default async function SettingsLayoutAppDir(props: SettingsLayoutProps) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  if (!userId) {
    return redirect("/auth/login");
  }

  let teamFeatures: Record<number, Record<keyof AppFlags, boolean>> | null = null;

  // For now we only grab organization features but it would be nice to fetch these on the server side for specific team feature flags
  if (session?.user.org) {
    const featuresRepository = new FeaturesRepository();
    const features = await featuresRepository.getTeamFeatures(session.user.org.id);
    if (features) {
      teamFeatures = {
        [session.user.org.id]: features,
      };
    }
  }

  return (
    <>
      <SettingsLayoutAppDirClient {...props} teamFeatures={teamFeatures} />
    </>
  );
}
