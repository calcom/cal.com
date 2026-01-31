import { z } from "zod";

import { createSignature, generateNonce } from "@calcom/features/ee/common/server/private-api-utils";
import {
  getDeploymentKey,
  getDeploymentSignatureToken,
} from "@calcom/features/ee/deployment/lib/getDeploymentKey";
import { DeploymentRepository } from "@calcom/features/ee/deployment/repositories/DeploymentRepository";
import { CALCOM_PRIVATE_API_ROUTE } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TInvoicesSchema } from "./invoices.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInvoicesSchema;
};

const invoiceSchema = z.object({
  id: z.string(),
  number: z.string().nullable(),
  status: z.string().nullable(),
  amount_due: z.number(),
  amount_paid: z.number(),
  currency: z.string(),
  created: z.number(),
  due_date: z.number().nullable(),
  hosted_invoice_url: z.string().nullable(),
  invoice_pdf: z.string().nullable(),
  period_start: z.number(),
  period_end: z.number(),
});

const responseSchema = z.object({
  invoices: z.array(invoiceSchema),
});

const invoicesHandler = async ({ input }: GetOptions) => {
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

  const response = await fetch(`${CALCOM_PRIVATE_API_ROUTE}/v1/license/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      nonce,
      signature,
      "x-cal-license-key": licenseKey,
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(5000),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.warn("Failed to fetch invoices", {
      message: data?.message,
      status: response.status,
    });
    throw new Error(data?.message || "Failed to fetch invoices");
  }

  return responseSchema.parse(data);
};

export default invoicesHandler;
