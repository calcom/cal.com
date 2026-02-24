import { createSignature, generateNonce } from "@calcom/features/ee/common/server/private-api-utils";
import { getDeploymentSignatureToken } from "@calcom/features/ee/deployment/lib/getDeploymentKey";
import { DeploymentRepository } from "@calcom/features/ee/deployment/repositories/DeploymentRepository";
import { CALCOM_PRIVATE_API_ROUTE } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { z } from "zod";
import type { TrpcSessionUser } from "../../../types";
import type { TGetDeploymentInfoSchema } from "./getDeploymentInfo.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetDeploymentInfoSchema;
};

const getDeploymentInfoHandler = async ({ input }: GetOptions) => {
  if (!CALCOM_PRIVATE_API_ROUTE) {
    throw new Error("Private API route does not exist in .env");
  }

  const deploymentRepo = new DeploymentRepository(prisma);
  const signatureToken = await getDeploymentSignatureToken(deploymentRepo);

  if (!signatureToken) {
    throw new Error("Signature token is missing");
  }

  // The admin GET endpoint uses query params, but the signature is computed over the body.
  // We send the email as a query param and sign an empty body for GET requests.
  const body = {};
  const nonce = generateNonce();
  const signature = createSignature(body, nonce, signatureToken);

  const url = new URL(`${CALCOM_PRIVATE_API_ROUTE}/v1/license/deployment`);
  url.searchParams.set("email", input.email);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      nonce,
      signature,
    },
    signal: AbortSignal.timeout(5000),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.warn("Failed to fetch deployment info", {
      message: data?.message,
      status: response.status,
    });
    throw new Error(data?.message || "Failed to fetch deployment info");
  }

  const keySchema = z.object({
    id: z.string(),
    key: z.string(),
    keyVariant: z.string(),
    active: z.boolean(),
    subscriptionId: z.string().nullable(),
    usageLimits: z
      .object({
        billingType: z.string(),
        entityCount: z.number(),
        entityPrice: z.number(),
        overages: z.number(),
      })
      .nullable(),
    usageAnalytics: z.array(
      z.object({
        date: z.string(),
        count: z.number(),
      })
    ),
  });

  const schema = z.object({
    id: z.string(),
    billingEmail: z.string(),
    customerId: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    keys: z.array(keySchema),
  });

  return schema.parse(data);
};

export default getDeploymentInfoHandler;
