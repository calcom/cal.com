import logger from "@calcom/lib/logger";
import { DelegationCredentialRepository } from "@calcom/lib/server/repository/delegationCredential";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";

import type { TDelegationCredentialGetAffectedMembersForDisableSchema } from "./schema";

const log = logger.getSubLogger({ prefix: ["[DelegationCredential]"] });
export async function getAffectedMembersForDisable({
  delegationCredentialId,
}: {
  delegationCredentialId: string;
}) {
  const credential = await DelegationCredentialRepository.findById({ id: delegationCredentialId });
  const noMembersAffected = [];
  if (!credential) {
    return noMembersAffected;
  }
  const lastEnabledAt = credential.lastEnabledAt;
  if (!lastEnabledAt) {
    log.info(
      `Delegation credential ${delegationCredentialId} has no lastEnabledAt, so assuming no members were affected`
    );
    return noMembersAffected;
  }

  // Find members who joined after the delegation credential was last enabled
  const membershipsThatCouldPotentiallyBeAffected =
    await MembershipRepository.findMembershipsCreatedAfterTimeIncludeUser({
      organizationId: credential.organizationId,
      time: lastEnabledAt,
    });

  return membershipsThatCouldPotentiallyBeAffected.map((membership) => ({
    email: membership.user.email,
    name: membership.user.name,
    id: membership.user.id,
  }));
}

export default function getAffectedMembersForDisableHandler({
  input,
}: {
  input: TDelegationCredentialGetAffectedMembersForDisableSchema;
}) {
  return getAffectedMembersForDisable({
    delegationCredentialId: input.id,
  });
}
