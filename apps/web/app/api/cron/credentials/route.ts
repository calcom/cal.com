/**
 * @description This route is used to create and delete Credential records for all members of an organization that has delegation credentials enabled.
 *
 * It also deletes Credential records for all members of an organization that has delegation credentials disabled.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { buildCredentialCreateData } from "@calcom/features/credentials/services/CredentialDataService";
import { DelegationCredentialRepository } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import { defaultResponderForAppDir } from "../../defaultResponderForAppDir";

const moduleLogger = logger.getSubLogger({ prefix: ["[api]", "[delegation]", "[credentials/cron]"] });
const batchSizeToCreateCredentials = 100;
const validateRequest = (req: NextRequest) => {
  const url = new URL(req.url);
  const apiKey = req.headers.get("authorization") || url.searchParams.get("apiKey");
  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
};

export async function handleCreateCredentials() {
  const log = moduleLogger.getSubLogger({ prefix: ["CreateCredentials"] });
  const delegationCredentials = await DelegationCredentialRepository.findAllEnabledIncludeDelegatedMembers();

  log.info(`Found ${delegationCredentials.length} enabled delegation credentials to create credentials for`);

  if (!delegationCredentials.length) {
    return {
      message: "No enabled delegation credentials found",
      success: 0,
      failures: 0,
    };
  }
  let totalSuccess = 0;
  let totalFailures = 0;
  for (const delegationCredential of delegationCredentials) {
    const { workspacePlatform, organization } = delegationCredential;

    if (workspacePlatform.slug !== "google") {
      log.info(
        `Skipping credential creation for workspace platform ${workspacePlatform.slug} - only google is supported`
      );
      continue;
    }

    // We can't know by looking at a Credential record in DB, if it has access to the `user.email` calendar in Google Calendar.
    // It could be a credential of a personal calendar of the same user. So, we can't just reuse any existing credential for the user, we have to check if this specific delegationCredential's UserCredential exists or not
    const existingCredentials =
      await CredentialRepository.findAllDelegationByUserIdsListAndDelegationCredentialIdAndType({
        userIds: organization.delegatedMembers.map((member) => member.userId),
        delegationCredentialId: delegationCredential.id,
        type: "google_calendar",
      });

    const existingCredentialUserIds = new Set(existingCredentials.map((cred) => cred.userId));
    const delegatedMembers = organization.delegatedMembers;
    const membersNeedingCredentials = delegatedMembers.filter(
      (member) => !existingCredentialUserIds.has(member.userId)
    );

    const toProcessMembers = membersNeedingCredentials.slice(0, batchSizeToCreateCredentials);

    log.info(
      `Creating credentials for ${toProcessMembers.length} members out of ${delegatedMembers.length} delegated members in organization ${organization.id}`
    );

    const credentialCreationPromises = toProcessMembers.map(async (member) => {
      try {
        const credentialData = buildCredentialCreateData({
          type: "google_calendar",
          key: {
            // The in-memory credential that we create for Delegation Credential has access_token as "NOOP_UNUSED_DELEGATION_TOKEN. This is to mark it is in DB, in case we need to identify that.
            access_token: "NOOP_UNUSED_DELEGATION_TOKEN_DB",
          },
          userId: member.userId,
          appId: "google-calendar",
          delegationCredentialId: delegationCredential.id,
        });
        await CredentialRepository.create(credentialData);
        log.info(`Created credential for member ${member.userId}`);
      } catch (error) {
        log.error(`Error creating credential for member ${member.userId}:`, safeStringify(error));
        throw error;
      }
    });
    const results = await Promise.allSettled(credentialCreationPromises);
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.filter((r) => r.status === "rejected").length;
    log.info(
      `Created ${successCount} credentials for delegationCredentialId: ${delegationCredential.id} and ${failureCount} failures`
    );
    totalSuccess += successCount;
    totalFailures += failureCount;
  }

  log.info(
    `Completed creating credentials for all delegation credentials. Total Success: ${totalSuccess}, Total Failures: ${totalFailures}`
  );

  return {
    executedAt: new Date().toISOString(),
    success: totalSuccess,
    failures: totalFailures,
  };
}

async function handleDeleteCredentials() {
  const log = moduleLogger.getSubLogger({ prefix: ["DeleteCredentials"] });
  const delegationCredentials =
    await DelegationCredentialRepository.findAllDisabledAndIncludeNextBatchOfMembersToProcess();

  log.info(`Found ${delegationCredentials.length} delegation credentials to delete credentials for`);

  if (!delegationCredentials.length) {
    return {
      message: "No disabled delegation credentials found",
      success: 0,
      failures: 0,
    };
  }
  let totalSuccess = 0;
  for (const delegationCredential of delegationCredentials) {
    const { workspacePlatform } = delegationCredential;

    if (workspacePlatform.slug !== "google") {
      log.info(
        `Skipping credential deletion for workspace platform ${workspacePlatform.slug} - only google is supported`
      );
      continue;
    }

    // DB?: can deleting all credentials at once be problematic?
    const { count } = await CredentialRepository.deleteAllByDelegationCredentialId({
      delegationCredentialId: delegationCredential.id,
    });
    totalSuccess += count;
  }
  log.info(`Deleted ${totalSuccess} credentials for disabled delegation credentials`);

  return {
    executedAt: new Date().toISOString(),
    success: totalSuccess,
    failures: 0,
  };
}

const handler = async (request: NextRequest) => {
  validateRequest(request);
  const result = await Promise.allSettled([handleCreateCredentials(), handleDeleteCredentials()]);
  const response = result.map((r, index) => {
    if (r.status === "fulfilled") {
      return {
        ...r.value,
        message: `Successfully executed ${index === 0 ? "create" : "delete"} credentials`,
      };
    }
    return {
      ...r.reason,
      message: `Failed to execute ${index === 0 ? "create" : "delete"} credentials`,
    };
  });
  return NextResponse.json(response);
};

export const GET = defaultResponderForAppDir(handler);
