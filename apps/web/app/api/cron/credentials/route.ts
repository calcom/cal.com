import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import { DelegationCredentialRepository } from "@calcom/lib/server/repository/delegationCredential";

import { defaultResponderForAppDir } from "../../defaultResponderForAppDir";

const log = logger.getSubLogger({ prefix: ["CreateCredentials"] });
const batchSizeToCreateCredentials = 100;
const validateRequest = (req: NextRequest) => {
  const url = new URL(req.url);
  const apiKey = req.headers.get("authorization") || url.searchParams.get("apiKey");
  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
};

async function handleCreateCredentials() {
  const delegationCredentials = await DelegationCredentialRepository.findAllEnabledIncludeDelegatedMembers();

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
      return;
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

    const membersNeedingCredentials = organization.delegatedMembers.filter(
      (member) => !existingCredentialUserIds.has(member.userId)
    );

    const toProcessMembers = membersNeedingCredentials.slice(0, batchSizeToCreateCredentials);

    log.info(
      `Creating credentials for ${toProcessMembers.length} members in organization ${organization.id}`
    );

    const credentialCreationPromises = toProcessMembers.map(async (member) => {
      try {
        await CredentialRepository.create({
          type: "google_calendar",
          key: {
            // The in-memory credential that we create for Delegation Credential has access_token as "NOOP_UNUSED_DELEGATION_TOKEN. This is to mark it is in DB, in case we need to identify that.
            access_token: "NOOP_UNUSED_DELEGATION_TOKEN_DB",
          },
          userId: member.userId,
          appId: "google-calendar",
          delegationCredentialId: delegationCredential.id,
        });
        log.info(`Created credential for member ${member.userId}`);
      } catch (error) {
        log.error(`Error creating credential for member ${member.userId}:`, error);
        throw error;
      }
    });
    const results = await Promise.allSettled(credentialCreationPromises);
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.filter((r) => r.status === "rejected").length;

    totalSuccess += successCount;
    totalFailures += failureCount;
  }

  return {
    executedAt: new Date().toISOString(),
    success: totalSuccess,
    failures: totalFailures,
  };
}

async function handleDeleteCredentials() {
  const delegationCredentials =
    await DelegationCredentialRepository.findAllDisabledAndIncludeNextBatchOfMembersToProcess();

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
