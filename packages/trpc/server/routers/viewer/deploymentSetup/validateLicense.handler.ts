import { LicenseKeySingleton } from "@calcom/features/ee/common/server/LicenseKeyService";
import { DeploymentRepository } from "@calcom/lib/server/repository/deployment";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TValidateLicenseInputSchema } from "./validateLicense.schema";

type ValidateLicenseOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TValidateLicenseInputSchema;
};

export const validateLicenseHandler = async ({ input }: ValidateLicenseOptions) => {
  const { licenseKey } = input;

  // Skip validation for E2E testing
  if (process.env.NEXT_PUBLIC_IS_E2E === "1") {
    return {
      valid: true,
      message: "License key is valid (E2E mode)",
    };
  }

  try {
    // Temporarily set the license key for validation
    const deploymentRepo = new DeploymentRepository(prisma);

    // Store the current license key to restore it later
    const currentDeployment = await deploymentRepo.getLicenseKeyWithId(1);

    // Temporarily set the new license key
    await prisma.deployment.upsert({
      where: { id: 1 },
      update: {
        licenseKey: licenseKey,
      },
      create: {
        licenseKey: licenseKey,
      },
    });

    try {
      // Use LicenseKeyService to validate the license
      const licenseKeyService = await LicenseKeySingleton.getInstance(deploymentRepo);
      const isValid = await licenseKeyService.checkLicense();

      return {
        valid: isValid,
        message: isValid ? "License key is valid" : "License key is invalid",
      };
    } finally {
      // Restore the original license key if it existed
      if (currentDeployment) {
        await prisma.deployment.update({
          where: { id: 1 },
          data: {
            licenseKey: currentDeployment,
          },
        });
      } else {
        // If there was no original license key, remove the temporary one
        await prisma.deployment.update({
          where: { id: 1 },
          data: {
            licenseKey: null,
          },
        });
      }
    }
  } catch (error) {
    console.error("License validation failed:", error);
    return {
      valid: false,
      message: "License key validation failed",
    };
  }
};
