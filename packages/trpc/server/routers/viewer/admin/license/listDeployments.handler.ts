import AdminLicenseKeyService from "@calcom/features/ee/common/server/AdminLicenseKeyService";
import type { ListDeploymentsQuery } from "@calcom/features/ee/common/server/types/admin";

import { TRPCError } from "@trpc/server";

type ListDeploymentsOptions = {
  ctx: {
    user: {
      id: number;
    };
  };
  input: {
    page?: number;
    pageSize?: number;
    billingEmail?: string;
    customerId?: string;
    keyActive?: boolean;
    createdAfter?: string;
    createdBefore?: string;
  };
};

export const listDeploymentsHandler = async ({ input }: ListDeploymentsOptions) => {
  const adminSignatureToken = process.env.CAL_SIGNATURE_TOKEN;

  if (!adminSignatureToken) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Admin signature token is not configured",
    });
  }

  const adminService = AdminLicenseKeyService.create(adminSignatureToken);

  const query: ListDeploymentsQuery = {
    page: input.page,
    pageSize: input.pageSize,
    billingEmail: input.billingEmail,
    customerId: input.customerId,
    keyActive: input.keyActive,
    createdAfter: input.createdAfter,
    createdBefore: input.createdBefore,
  };

  try {
    const result = await adminService.listDeployments(query);
    return result;
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Failed to list deployments",
    });
  }
};

export default listDeploymentsHandler;
