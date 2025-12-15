import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { isCompanyEmail } from "@calcom/features/ee/organizations/lib/utils";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { OnboardingPathService } from "@calcom/features/onboarding/lib/onboarding-path.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { OrganizationMigrateTeamsView } from "~/onboarding/organization/migrate-teams/organization-migrate-teams-view";

type PageProps = {
  searchParams: Promise<{ migrate?: string }>;
};

export default async function MigrateTeamsPage({ searchParams }: PageProps) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const userEmail = session.user.email || "";
  const userId = session.user.id;

  const gettingStartedPath = await OnboardingPathService.getGettingStartedPath(prisma);

  if (!isCompanyEmail(userEmail)) {
    return redirect(gettingStartedPath);
  }

  const userRepository = new UserRepository(prisma);
  const { organizations } = await userRepository.findOrganizations({ userId });

  if (organizations.length > 0) {
    return redirect(gettingStartedPath);
  }

  // Check for migrate query param
  const params = await searchParams;
  const migrateParam = params?.migrate;

  // If no migrate param, redirect to teams step
  if (migrateParam !== "true") {
    return redirect("/onboarding/organization/teams");
  }

  // Check if user has teams to migrate
  const teamRepository = new TeamRepository(prisma);
  const ownedTeams = await teamRepository.findOwnedTeamsByUserId({ userId });

  // If no teams, redirect to teams step
  if (ownedTeams.length === 0) {
    return redirect("/onboarding/organization/teams");
  }

  return <OrganizationMigrateTeamsView userEmail={userEmail} />;
}
