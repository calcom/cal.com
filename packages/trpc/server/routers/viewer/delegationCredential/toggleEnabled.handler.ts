import type { z } from "zod";

import { checkIfSuccessfullyConfiguredInWorkspace } from "@calcom/lib/delegationCredential/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import { DelegationCredentialRepository } from "@calcom/lib/server/repository/delegationCredential";
import type { ServiceAccountKey } from "@calcom/lib/server/repository/delegationCredential";

import type { DelegationCredentialToggleEnabledSchema } from "./schema";
import { ensureNoServiceAccountKey } from "./utils";

type LoggedInUser = {
  id: number;
  email: string;
  locale: string;
  emailVerified: Date | null;
  organizationId: number | null;
};

export default async function toggleEnabledHandler({
  ctx,
  input,
}: {
  ctx: {
    user: LoggedInUser;
  };
  input: z.infer<typeof DelegationCredentialToggleEnabledSchema>;
}) {
  const { user: loggedInUser } = ctx;
  const t = await getTranslation(ctx.user.locale ?? "en", "common");

  if (!loggedInUser.emailVerified) {
    throw new Error(t("verify_your_email"));
  }

  return toggleDelegationCredentialEnabled(loggedInUser, input);
}

export async function toggleDelegationCredentialEnabled(
  loggedInUser: Omit<LoggedInUser, "locale" | "emailVerified">,
  input: z.infer<typeof DelegationCredentialToggleEnabledSchema>
) {
  if (input.enabled) {
    await assertWorkspaceConfigured({
      delegationCredentialId: input.id,
      user: loggedInUser,
    });
  }

  const updatedDelegationCredential = await DelegationCredentialRepository.updateById({
    id: input.id,
    data: {
      enabled: input.enabled,
    },
  });

  return ensureNoServiceAccountKey(updatedDelegationCredential);
}

const assertWorkspaceConfigured = async ({
  delegationCredentialId,
  user,
}: {
  delegationCredentialId: string;
  user: { id: number; email: string; organizationId: number | null };
}) => {
  const delegationCredential = await DelegationCredentialRepository.findByIdIncludeSensitiveServiceAccountKey(
    {
      id: delegationCredentialId,
    }
  );

  if (!delegationCredential) {
    throw new Error("Domain wide delegation not found");
  }

  if (!hasServiceAccountKey(delegationCredential)) {
    throw new Error("Domain wide delegation doesn't have service account key");
  }

  const isSuccessfullyConfigured = await checkIfSuccessfullyConfiguredInWorkspace({
    delegationCredential,
    user,
  });

  if (!isSuccessfullyConfigured) {
    throw new Error("Workspace not successfully configured");
  }
};

function hasServiceAccountKey<T extends { serviceAccountKey: ServiceAccountKey | null }>(
  delegationCredential: T
): delegationCredential is T & { serviceAccountKey: ServiceAccountKey } {
  return delegationCredential.serviceAccountKey !== null;
}
