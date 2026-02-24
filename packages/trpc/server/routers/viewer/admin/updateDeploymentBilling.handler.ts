import { createSignature, generateNonce } from "@calcom/features/ee/common/server/private-api-utils";
import { getDeploymentSignatureToken } from "@calcom/features/ee/deployment/lib/getDeploymentKey";
import { DeploymentRepository } from "@calcom/features/ee/deployment/repositories/DeploymentRepository";
import { CALCOM_PRIVATE_API_ROUTE } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { z } from "zod";
import type { TrpcSessionUser } from "../../../types";
import type { TUpdateDeploymentBillingSchema } from "./updateDeploymentBilling.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateDeploymentBillingSchema;
};

const updateDeploymentBillingHandler = async ({ input }: GetOptions) => {
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

  const response = await fetch(`${CALCOM_PRIVATE_API_ROUTE}/v1/license/billing/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      nonce,
      signature,
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(5000),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.warn("Failed to update deployment billing", {
      message: data?.message,
      status: response.status,
    });
    throw new Error(data?.message || "Failed to update deployment billing");
  }

  const schema = z.object({
    id: z.string(),
    billingEmail: z.string(),
    customerId: z.string().nullable(),
    subscriptionId: z.string().nullable(),
  });

  return schema.parse(data);
};

export default updateDeploymentBillingHandler;
