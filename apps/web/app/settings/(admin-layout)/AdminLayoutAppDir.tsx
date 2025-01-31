import dynamic from "next/dynamic";
import { cookies, headers } from "next/headers";
import React from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import SettingsLayoutAppDir from "../(settings-layout)/SettingsLayoutAppDir";
import type { AdminLayoutProps } from "./AdminLayoutAppDirClient";

const AdminLayoutAppDirClient = dynamic(() => import("./AdminLayoutAppDirClient"), {
  ssr: false,
});

type AdminLayoutAppDirProps = Omit<AdminLayoutProps, "userRole">;

export default async function AdminLayoutAppDir(props: AdminLayoutAppDirProps) {
  const session = await getServerSession({ req: buildLegacyRequest(headers(), cookies()) });
  const userRole = session?.user?.role;

  return await SettingsLayoutAppDir({ children: <AdminLayoutAppDirClient {...props} userRole={userRole} /> });
}

export const getLayout = async (page: React.ReactElement) => await AdminLayoutAppDir({ children: page });
