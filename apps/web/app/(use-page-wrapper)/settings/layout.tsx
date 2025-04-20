import { cookies, headers } from "next/headers";
import type React from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import SettingsLayoutAppDir from "./(settings-layout)/layout";

export default async function SettingsLayout(props: { children: React.ReactNode }) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  return await SettingsLayoutAppDir({ children: props.children });
}
