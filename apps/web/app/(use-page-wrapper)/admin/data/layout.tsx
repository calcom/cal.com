import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
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
      className="bg-default fixed inset-0 overflow-hidden"
      style={{ width: "100vw", height: "100vh" }}
    >
      <StudioProvider>{children}</StudioProvider>
    </div>
  );
}
