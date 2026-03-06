import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { OnboardingPathService } from "@calcom/features/onboarding/lib/onboarding-path.service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function OrganizationOnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const userId = session.user.id;

  const gettingStartedPath = await OnboardingPathService.getGettingStartedPath();

  const userRepository = new UserRepository(prisma);
  const { organizations } = await userRepository.findOrganizations({ userId });

  if (organizations.length > 0) {
    return redirect(gettingStartedPath);
  }

  return children;
}
