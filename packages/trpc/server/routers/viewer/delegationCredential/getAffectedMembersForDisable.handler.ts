import logger from "@calcom/lib/logger";
import { DelegationCredentialRepository } from "@calcom/lib/server/repository/delegationCredential";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import type { Ensure } from "@calcom/types/utils";

import type { TDelegationCredentialGetAffectedMembersForDisableSchema } from "./schema";

const log = logger.getSubLogger({ prefix: ["[DelegationCredential]"] });
export async function getAffectedMembersForDisable({
  delegationCredentialId,
}: {
  delegationCredentialId: string;
}) {
  const credential = await DelegationCredentialRepository.findById({ id: delegationCredentialId });
  if (!credential) {
    return [];
  }
  const lastEnabledAt = credential.lastEnabledAt;
  if (!lastEnabledAt) {
    log.info(
      `Delegation credential ${delegationCredentialId} has no lastEnabledAt, so assuming no members were affected`
    );
    return [];
  }
  const memberships = await MembershipRepository.findMembershipsCreatedAfterTimeIncludeUser({
    organizationId: credential.organizationId,
    time: lastEnabledAt,
  });

  console.log({ memberships });

  return memberships
    .filter((m): m is Ensure<typeof m, "user"> => !!m.user)
    .map((m) => ({
      email: m.user.email,
      name: m.user.name,
      id: m.user.id,
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
