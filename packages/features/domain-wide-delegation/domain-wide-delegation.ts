import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";
import prisma from "@calcom/prisma";

import { MockDomainWideDelegationRepository } from "./mock-domain-wide-delegation.repository";

export class DomainWideDelegation {
  static async checkIfDwDIsEnabled(userId: number, teamId: number | null) {
    if (!teamId) {
      return false;
    }
    const teamFeature = await prisma.teamFeatures.findFirst({
      where: {
        teamId: teamId,
        featureId: "domain-wide-delegation",
      },
    });

    const membership = await prisma.membership.findFirst({
      where: {
        userId: userId,
        teamId: teamId,
        accepted: true,
      },
    });

    return !!(teamFeature && membership);
  }

  static async init() {
    const featureRepo = new FeaturesRepository();
    const isDomainWideDelegationEnabledGlobally = await featureRepo.checkIfFeatureIsEnabledGlobally(
      "domain-wide-delegation"
    );

    console.log("isDomainWideDelegationEnabledGlobally", isDomainWideDelegationEnabledGlobally);

    if (!isDomainWideDelegationEnabledGlobally) {
      return new MockDomainWideDelegationRepository();
    }

    return new DomainWideDelegationRepository();
  }
}
