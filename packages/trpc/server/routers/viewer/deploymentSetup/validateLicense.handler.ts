import LicenseKeyService from "@calcom/features/ee/common/server/LicenseKeyService";

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
    const isValid = await LicenseKeyService.validateLicenseKey(licenseKey);

    return {
      valid: isValid,
      message: isValid ? "License key is valid" : "License key is invalid",
    };
  } catch (error) {
    console.error("License validation failed:", error);
    return {
      valid: false,
      message: "License key validation failed",
    };
  }
};
