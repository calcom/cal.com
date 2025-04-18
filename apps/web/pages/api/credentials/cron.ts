import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { DelegationCredentialRepository } from "@calcom/lib/server/repository/delegationCredential";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["CreateCredentials"] });
const batchSizeToCreateCredentials = 100;
const validateRequest = (req: NextApiRequest) => {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
};

async function handleCreateCredentials() {
  const delegationCredentials =
    await DelegationCredentialRepository.findAllEnabledAndIncludeNextBatchOfMembersToProcess();

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

    const existingCredentials = await prisma.credential.findMany({
      where: {
        userId: {
          in: organization.members.map((member) => member.userId),
        },
        type: "google_calendar",
      },
      select: {
        userId: true,
      },
    });

    const existingCredentialUserIds = new Set(existingCredentials.map((cred) => cred.userId));

    const membersNeedingCredentials = organization.members.filter(
      (member) => !existingCredentialUserIds.has(member.userId)
    );

    const toProcessMembers = membersNeedingCredentials.slice(0, batchSizeToCreateCredentials);

    log.info(
      `Creating credentials for ${toProcessMembers.length} members in organization ${organization.id}`
    );

    const credentialCreationPromises = toProcessMembers.map(async (member) => {
      try {
        await prisma.credential.create({
          data: {
            type: "google_calendar",
            key: {
              access_token: "NOOP_UNUSED_DELEGATION_TOKEN",
            },
            userId: member.userId,
            appId: "google-calendar",
            invalid: false,
            delegationCredentialId: delegationCredential.id,
          },
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
    const { count } = await prisma.credential.deleteMany({
      where: {
        delegationCredentialId: delegationCredential.id,
      },
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

const handler = defaultResponder(async (request: NextApiRequest) => {
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
  return response;
});

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
