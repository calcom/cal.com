import { getServerSession } from "next-auth";
import dynamic from "next/dynamic";
import React from "react";

import { AUTH_OPTIONS } from "@calcom/features/auth/lib/next-auth-options";
import SettingsLayoutAppDir from "@calcom/features/settings/appDir/SettingsLayoutAppDir";

import type { AdminLayoutProps } from "./AdminLayoutAppDirClient";

const AdminLayoutAppDirClient = dynamic(() => import("./AdminLayoutAppDirClient"), {
  ssr: false,
});

type AdminLayoutAppDirProps = Omit<AdminLayoutProps, "userRole">;

export default async function AdminLayoutAppDir(props: AdminLayoutAppDirProps) {
  const session = await getServerSession(AUTH_OPTIONS);
  const userRole = session?.user?.role;

  return await SettingsLayoutAppDir({ children: <AdminLayoutAppDirClient {...props} userRole={userRole} /> });
}

export const getLayout = async (page: React.ReactElement) => await AdminLayoutAppDir({ children: page });
