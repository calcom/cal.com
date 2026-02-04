import { z } from "zod";

import { createSignature, generateNonce } from "@calcom/features/ee/common/server/private-api-utils";
import { getDeploymentSignatureToken } from "@calcom/features/ee/deployment/lib/getDeploymentKey";
import { DeploymentRepository } from "@calcom/features/ee/deployment/repositories/DeploymentRepository";
import { CALCOM_PRIVATE_API_ROUTE } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TResendPurchaseCompleteEmailSchema } from "./resendPurchaseCompleteEmail.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TResendPurchaseCompleteEmailSchema;
};

const resendPurchaseCompleteEmailHandler = async ({ input }: GetOptions) => {
  if (!CALCOM_PRIVATE_API_ROUTE) {
    throw new Error("Private API route does not exist in .env");
  }

  const deploymentRepo = new DeploymentRepository(prisma);
  const signatureToken = await getDeploymentSignatureToken(deploymentRepo);

  if (!signatureToken) {
    throw new Error("Signature token is missing");
  }

  const nonce = generateNonce();
  const signature = createSignature(input, nonce, signatureToken);

  const response = await fetch(`${CALCOM_PRIVATE_API_ROUTE}/v1/license/purchase-complete-email/resend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      nonce,
      signature,
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(2000),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.warn("Failed to resend purchase complete email", {
      message: data?.message,
      status: response.status,
    });
    throw new Error(data?.message || "Failed to resend purchase complete email");
  }

  const schema = z.object({
    success: z.boolean(),
  });

  return schema.parse(data);
};

export default resendPurchaseCompleteEmailHandler;
