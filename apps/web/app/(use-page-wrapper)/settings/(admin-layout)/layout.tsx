import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";
import SettingsLayoutAppDir from "../(settings-layout)/layout";
import type { AdminLayoutProps } from "./AdminLayoutAppDirClient";
import AdminLayoutAppDirClient from "./AdminLayoutAppDirClient";

type AdminLayoutAppDirProps = Omit<AdminLayoutProps, "userRole">;

export default async function AdminLayoutAppDir(props: AdminLayoutAppDirProps) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userRole = session?.user?.role;

  if (userRole !== UserPermissionRole.ADMIN) {
    return redirect("/settings/my-account/profile");
  }

  return await SettingsLayoutAppDir({ children: <AdminLayoutAppDirClient {...props} userRole={userRole} /> });
}
