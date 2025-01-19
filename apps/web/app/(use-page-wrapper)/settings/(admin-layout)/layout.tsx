import dynamic from "next/dynamic";

import { getServerSessionForAppDir } from "@calcom/feature-auth/lib/get-server-session-for-app-dir";

import type { AdminLayoutProps } from "@components/auth/layouts/AdminLayoutAppDirClient";

import SettingsLayoutAppDir from "../(settings-layout)/layout";

const AdminLayoutAppDirClient = dynamic(() => import("@components/auth/layouts/AdminLayoutAppDirClient"), {
  ssr: false,
});

type AdminLayoutAppDirProps = Omit<AdminLayoutProps, "userRole">;

export default async function AdminLayoutAppDir(props: AdminLayoutAppDirProps) {
  // FIXME: Refactor me once next-auth endpoint is migrated to App Router
  const session = await getServerSessionForAppDir();
  const userRole = session?.user?.role;

  return await SettingsLayoutAppDir({ children: <AdminLayoutAppDirClient {...props} userRole={userRole} /> });
}
