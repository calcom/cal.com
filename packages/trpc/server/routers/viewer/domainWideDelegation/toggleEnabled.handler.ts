import type { z } from "zod";

import { checkIfSuccessfullyConfiguredInWorkspace } from "@calcom/lib/domainWideDelegation/server";
import { getTranslation } from "@calcom/lib/server/i18n";
import { DomainWideDelegationRepository } from "@calcom/lib/server/repository/domainWideDelegation";
import type { ServiceAccountKey } from "@calcom/lib/server/repository/domainWideDelegation";

import type { DomainWideDelegationToggleEnabledSchema } from "./schema";
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
  input: z.infer<typeof DomainWideDelegationToggleEnabledSchema>;
}) {
  const { user: loggedInUser } = ctx;
  const t = await getTranslation(ctx.user.locale ?? "en", "common");

  if (!loggedInUser.emailVerified) {
    throw new Error(t("verify_your_email"));
  }

  return toggleDwdEnabled(loggedInUser, input);
}

export async function toggleDwdEnabled(
  loggedInUser: Omit<LoggedInUser, "locale" | "emailVerified">,
  input: z.infer<typeof DomainWideDelegationToggleEnabledSchema>
) {
  if (input.enabled) {
    await assertWorkspaceConfigured({
      domainWideDelegationId: input.id,
      user: loggedInUser,
    });
  }

  const updatedDomainWideDelegation = await DomainWideDelegationRepository.updateById({
    id: input.id,
    data: {
      enabled: input.enabled,
    },
  });

  return ensureNoServiceAccountKey(updatedDomainWideDelegation);
}

const assertWorkspaceConfigured = async ({
  domainWideDelegationId,
  user,
}: {
  domainWideDelegationId: string;
  user: { id: number; email: string; organizationId: number | null };
}) => {
  const dwd = await DomainWideDelegationRepository.findByIdIncludeSensitiveServiceAccountKey({
    id: domainWideDelegationId,
  });

  if (!dwd) {
    throw new Error("Domain wide delegation not found");
  }

  if (!hasServiceAccountKey(dwd)) {
    throw new Error("Domain wide delegation doesn't have service account key");
  }

  const isSuccessfullyConfigured = await checkIfSuccessfullyConfiguredInWorkspace({
    dwd,
    user,
  });

  if (!isSuccessfullyConfigured) {
    throw new Error("Workspace not successfully configured");
  }
};

function hasServiceAccountKey<T extends { serviceAccountKey: ServiceAccountKey | null }>(
  domainWideDelegation: T
): domainWideDelegation is T & { serviceAccountKey: ServiceAccountKey } {
  return domainWideDelegation.serviceAccountKey !== null;
}
