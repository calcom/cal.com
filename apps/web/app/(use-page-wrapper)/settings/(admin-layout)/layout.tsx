import { cookies, headers } from "next/headers";
import React from "react";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import SettingsLayoutAppDir from "../(settings-layout)/layout";
import type { AdminLayoutProps } from "./AdminLayoutAppDirClient";
import AdminLayoutAppDirClient from "./AdminLayoutAppDirClient";

type AdminLayoutAppDirProps = Omit<AdminLayoutProps, "userRole">;

export default async function AdminLayoutAppDir(props: AdminLayoutAppDirProps) {
  const req = {
    headers: (await headers()) as any,
    cookies: (await cookies()) as any,
  } as any;
  const session = await getServerSession({ req });
  const userRole = session?.user?.role;

  return await SettingsLayoutAppDir({ children: <AdminLayoutAppDirClient {...props} userRole={userRole} /> });
}
