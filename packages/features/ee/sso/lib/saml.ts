import process from "node:process";
import type { OIDCSSORecord, SAMLSSORecord } from "@boxyhq/saml-jackson";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { MembershipRole } from "@calcom/prisma/enums";

export const samlDatabaseUrl = process.env.SAML_DATABASE_URL || "";
export const isSAMLLoginEnabled = samlDatabaseUrl.length > 0;

export const samlTenantID = "Cal.com";
export const samlProductID = "Cal.com";
export const samlAudience = "https://saml.cal.com";
export const samlPath = "/api/auth/saml/callback";
export const oidcPath = "/api/auth/oidc";
export const clientSecretVerifier = process.env.SAML_CLIENT_SECRET_VERIFIER || "dummy";

export const hostedCal = Boolean(HOSTED_CAL_FEATURES);
export const tenantPrefix = "team-";

const samlAdmins = (process.env.SAML_ADMINS || "").split(",");

export const isSAMLAdmin = (email: string) => {
  for (const admin of samlAdmins) {
    if (admin.toLowerCase() === email.toLowerCase() && admin.toUpperCase() === email.toUpperCase()) {
      return true;
    }
  }

  return false;
};

export const canAccessOrganization = async (user: { id: number; email: string }, teamId: number | null) => {
  const { id: userId, email } = user;

  if (!isSAMLLoginEnabled) {
    return {
      message: "To enable this feature, add value for `SAML_DATABASE_URL` and `SAML_ADMINS` to your `.env`",
      access: false,
    };
  }

  // Hosted
  if (HOSTED_CAL_FEATURES) {
    if (teamId === null) {
      return {
        message: "dont_have_permission",
        access: false,
      };
    }

    const permissionCheckService = new PermissionCheckService();
    const hasPermission = await permissionCheckService.checkPermission({
      userId,
      teamId,
      permission: "organization.read",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });

    if (!hasPermission) {
      return {
        message: "dont_have_permission",
        access: false,
      };
    }
  }

  // Self-hosted
  if (!HOSTED_CAL_FEATURES) {
    if (!isSAMLAdmin(email)) {
      return {
        message: "dont_have_permission",
        access: false,
      };
    }
  }

  return {
    message: "success",
    access: true,
  };
};

export type SSOConnection = (SAMLSSORecord | OIDCSSORecord) & {
  type: string;
  acsUrl: string | null;
  entityId: string | null;
  callbackUrl: string | null;
};
