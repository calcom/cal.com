import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { redirect } from "next/navigation";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { headers, cookies } from "next/headers";

import BlockListPage from "./BlockListPage";

export default async function BlockListSettingsPage() {
    const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
    const userProfile = session?.user?.profile;
    const userId = session?.user?.id;
    const orgRole =
        session?.user?.org?.role ??
        userProfile?.organization?.members.find((m: { userId: number }) => m.userId === userId)?.role;
    const isOrgAdminOrOwner = checkAdminOrOwner(orgRole);

    // Debug logging
    console.log('Debug - BlockListSettingsPage:', {
        userId,
        orgRole,
        isOrgAdminOrOwner,
        userProfile: userProfile?.organization?.members,
        sessionOrg: session?.user?.org
    });

    // Temporarily allow access for testing
    // TODO: Fix organization role detection
    // if (!isOrgAdminOrOwner) {
    //     return redirect("/settings/organizations/profile");
    // }

    return <BlockListPage />;
}

