import type { z } from "zod";

import { checkIfSuccessfullyConfiguredInWorkspace } from "@calcom/app-store/delegationCredential";
import { sendDelegationCredentialDisabledEmail } from "@calcom/emails/integration-email-service";
import { DelegationCredentialRepository } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";
import type { ServiceAccountKey } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";

import { getAffectedMembersForDisable } from "./getAffectedMembersForDisable.handler";
import type { DelegationCredentialToggleEnabledSchema } from "./schema";
import { ensureNoServiceAccountKey } from "./utils";

const log = logger.getSubLogger({ prefix: ["viewer", "delegationCredential", "toggleEnabled"] });

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
  // Fetch the current credential to check the current enabled state
  const currentDelegationCredential = await DelegationCredentialRepository.findById({
    id: input.id,
  });

  if (!currentDelegationCredential) {
    throw new Error("Delegation credential not found");
  }

  if (!loggedInUser.organizationId) {
    throw new Error("You must be part of an organization to toggle a delegation credential");
  }

  if (currentDelegationCredential.organizationId !== loggedInUser.organizationId) {
    throw new Error("Delegation credential not found");
  }

  const shouldBeEnabled = input.enabled;

  if (shouldBeEnabled === currentDelegationCredential.enabled) {
    // Already enabled or disabled, so no need to do anything
    return currentDelegationCredential;
  }

  if (shouldBeEnabled) {
    await assertWorkspaceConfigured({
      delegationCredentialId: input.id,
      user: loggedInUser,
    });
  }

  if (!shouldBeEnabled) {
    const affectedMemberships = await getAffectedMembersForDisable({ delegationCredentialId: input.id });
    const slug = currentDelegationCredential.workspacePlatform?.slug;
    if (!slug) {
      log.error(`Delegation credential ${input.id} has no workspace platform slug`);
    }

    let calendarAppName: string;
    let conferencingAppName: string;

    if (slug === "google") {
      calendarAppName = "Google Calendar";
      conferencingAppName = "Google Meet";
    } else if (slug === "office365") {
      calendarAppName = "Microsoft 365";
      conferencingAppName = "Microsoft Teams";
    } else {
      throw new Error(`Unsupported workspace platform slug: ${slug}`);
    }

    for (const membership of affectedMemberships) {
      if (membership.email) {
        await sendDelegationCredentialDisabledEmail({
          recipientEmail: membership.email,
          recipientName: membership.name || undefined,
          calendarAppName,
          conferencingAppName,
        });
      }
    }
  }

  const updatedDelegationCredential = await DelegationCredentialRepository.updateById({
    id: input.id,
    data: {
      enabled: shouldBeEnabled,
      // Don't touch lastEnabledAt if we are disabling
      lastEnabledAt: shouldBeEnabled ? new Date() : undefined,
      // Don't touch lastDisabledAt if we are enabling
      lastDisabledAt: shouldBeEnabled ? undefined : new Date(),
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
