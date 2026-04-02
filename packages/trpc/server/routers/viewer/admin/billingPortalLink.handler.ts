import { createSignature, generateNonce } from "@calcom/features/ee/common/server/private-api-utils";
import {
  getDeploymentKey,
  getDeploymentSignatureToken,
} from "@calcom/features/ee/deployment/lib/getDeploymentKey";
import { DeploymentRepository } from "@calcom/features/ee/deployment/repositories/DeploymentRepository";
import { CALCOM_PRIVATE_API_ROUTE } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { z } from "zod";
import type { TrpcSessionUser } from "../../../types";
import type { TBillingPortalLinkSchema } from "./billingPortalLink.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBillingPortalLinkSchema;
};

const billingPortalLinkHandler = async ({ input }: GetOptions) => {
  if (!CALCOM_PRIVATE_API_ROUTE) {
    throw new Error("Private API route does not exist in .env");
  }

  const deploymentRepo = new DeploymentRepository(prisma);
  const [licenseKey, signatureToken] = await Promise.all([
    getDeploymentKey(deploymentRepo),
    getDeploymentSignatureToken(deploymentRepo),
  ]);

  if (!licenseKey) {
    throw new Error("License key is missing");
  }

  if (!signatureToken) {
    throw new Error("Signature token is missing");
  }

  const nonce = generateNonce();
  const signature = createSignature(input, nonce, signatureToken);

  const response = await fetch(`${CALCOM_PRIVATE_API_ROUTE}/v1/license/billing-portal-link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      nonce,
      signature,
      "x-cal-license-key": licenseKey,
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(2000),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.warn("Failed to fetch billing portal link", {
      message: data?.message,
      status: response.status,
    });
    throw new Error(data?.message || "Failed to fetch billing portal link");
  }

  const schema = z.object({
    url: z.string(),
  });

  return schema.parse(data);
};

export default billingPortalLinkHandler;
