import dynamic from "next/dynamic";
import React from "react";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";
import SettingsLayoutAppDir from "@calcom/features/settings/appDir/SettingsLayoutAppDir";

import type { AdminLayoutProps } from "./AdminLayoutAppDirClient";

const AdminLayoutAppDirClient = dynamic(() => import("./AdminLayoutAppDirClient"), {
  ssr: false,
});

type AdminLayoutAppDirProps = Omit<AdminLayoutProps, "userRole">;

export default async function AdminLayoutAppDir(props: AdminLayoutAppDirProps) {
  // FIXME: Refactor me once next-auth endpoint is migrated to App Router
  const session = await getServerSessionForAppDir();
  const userRole = session?.user?.role;

  return await SettingsLayoutAppDir({ children: <AdminLayoutAppDirClient {...props} userRole={userRole} /> });
}

export const getLayout = async (page: React.ReactElement) => await AdminLayoutAppDir({ children: page });
