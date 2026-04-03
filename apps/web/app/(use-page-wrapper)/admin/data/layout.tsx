import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { IS_PRODUCTION, WEBAPP_URL } from "@calcom/lib/constants";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { StudioProvider } from "~/admin-dataview/contexts/StudioContext";

export default async function AdminDataStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession({
    req: buildLegacyRequest(await headers(), await cookies()),
  });

  if (session?.user?.role !== UserPermissionRole.ADMIN) {
    return redirect("/settings/my-account/profile");
  }

  return (
    <div
      className="bg-default fixed inset-0 flex flex-col overflow-hidden"
      style={{ width: "100vw", height: "100vh" }}
    >
      {IS_PRODUCTION && (
        <div className="flex shrink-0 items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white">
          PRODUCTION DATABASE — {WEBAPP_URL} — Proceed with caution
        </div>
      )}
      <div className="min-h-0 flex-1">
        <StudioProvider>{children}</StudioProvider>
      </div>
    </div>
  );
}
