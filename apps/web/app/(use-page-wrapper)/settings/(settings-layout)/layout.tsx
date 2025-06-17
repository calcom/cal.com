import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { AppFlags } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import type { SettingsLayoutProps } from "./SettingsLayoutAppDirClient";
import SettingsLayoutAppDirClient from "./SettingsLayoutAppDirClient";

const getTeamFeatures = unstable_cache(
  async (teamId: number) => {
    const featuresRepository = new FeaturesRepository();
    return await featuresRepository.getTeamFeatures(teamId);
  },
  ["team-features"],
  {
    revalidate: 120,
  }
);

export default async function SettingsLayoutAppDir(props: SettingsLayoutProps) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  if (!userId) {
    return redirect("/auth/login");
  }

  let teamFeatures: Record<number, Record<keyof AppFlags, boolean>> | null = null;

  // For now we only grab organization features but it would be nice to fetch these on the server side for specific team feature flags
  if (session?.user.org) {
    const features = await getTeamFeatures(session.user.org.id);
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
