import AdminLicenseKeyService from "@calcom/features/ee/common/server/AdminLicenseKeyService";
import type {
  UpdateDeploymentRequest,
  UpdateKeyRequest,
} from "@calcom/features/ee/common/server/types/admin";

import { TRPCError } from "@trpc/server";

type UpdateDeploymentOptions = {
  ctx: {
    user: {
      id: number;
    };
  };
  input: {
    id: string;
    billingEmail?: string;
    customerId?: string;
    metadata?: Record<string, unknown>;
    signature?: string;
  };
};

export const updateDeploymentHandler = async ({ input }: UpdateDeploymentOptions) => {
  const adminSignatureToken = process.env.CAL_SIGNATURE_TOKEN;

  if (!adminSignatureToken) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Admin signature token is not configured",
    });
  }

  const adminService = AdminLicenseKeyService.create(adminSignatureToken);

  const updateData: UpdateDeploymentRequest = {
    billingEmail: input.billingEmail,
    customerId: input.customerId,
    metadata: input.metadata,
    signature: input.signature,
  };

  try {
    const result = await adminService.updateDeployment(input.id, updateData);
    return result;
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to update deployment",
    });
  }
};

type SendLicenseEmailOptions = {
  ctx: {
    user: {
      id: number;
    };
  };
  input: {
    id: string;
  };
};

export const sendLicenseEmailHandler = async ({ input }: SendLicenseEmailOptions) => {
  const adminSignatureToken = process.env.CAL_SIGNATURE_TOKEN;

  if (!adminSignatureToken) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Admin signature token is not configured",
    });
  }

  const adminService = AdminLicenseKeyService.create(adminSignatureToken);

  try {
    const result = await adminService.sendLicenseEmail(input.id);
    return result;
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to send license email",
    });
  }
};

type GetDeploymentStripeInfoOptions = {
  ctx: {
    user: {
      id: number;
    };
  };
  input: {
    id: string;
  };
};

export const getDeploymentStripeInfoHandler = async ({ input }: GetDeploymentStripeInfoOptions) => {
  const adminSignatureToken = process.env.CAL_SIGNATURE_TOKEN;

  if (!adminSignatureToken) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Admin signature token is not configured",
    });
  }

  const adminService = AdminLicenseKeyService.create(adminSignatureToken);

  try {
    const result = await adminService.getDeploymentStripeInfo(input.id);
    return result;
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to get deployment Stripe info",
    });
  }
};

type UpdateLicenseKeyOptions = {
  ctx: {
    user: {
      id: number;
    };
  };
  input: {
    id: string;
    active?: boolean;
    skipVerification?: boolean;
    subscriptionId?: string;
    usageLimits?: {
      entityCount?: number;
      entityPrice?: number;
      overages?: number;
    };
  };
};

export const updateLicenseKeyHandler = async ({ input }: UpdateLicenseKeyOptions) => {
  const adminSignatureToken = process.env.CAL_SIGNATURE_TOKEN;

  if (!adminSignatureToken) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Admin signature token is not configured",
    });
  }

  const adminService = AdminLicenseKeyService.create(adminSignatureToken);

  const updateData: UpdateKeyRequest = {
    active: input.active,
    skipVerification: input.skipVerification,
    subscriptionId: input.subscriptionId,
    usageLimits: input.usageLimits,
  };

  try {
    const result = await adminService.updateLicenseKey(input.id, updateData);
    return result;
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to update license key",
    });
  }
};

type GetLicenseKeyStripeInfoOptions = {
  ctx: {
    user: {
      id: number;
    };
  };
  input: {
    id: string;
  };
};

export const getLicenseKeyStripeInfoHandler = async ({ input }: GetLicenseKeyStripeInfoOptions) => {
  const adminSignatureToken = process.env.CAL_SIGNATURE_TOKEN;

  if (!adminSignatureToken) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Admin signature token is not configured",
    });
  }

  const adminService = AdminLicenseKeyService.create(adminSignatureToken);

  try {
    const result = await adminService.getLicenseKeyStripeInfo(input.id);
    return result;
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to get license key Stripe info",
    });
  }
};
