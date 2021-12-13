import { BASE_URL } from "@lib/config/constants";

export const samlDatabaseUrl = process.env.SAML_DATABASE_URL || "";
export const samlLoginUrl = BASE_URL;

export const isSAMLLoginEnabled = samlDatabaseUrl.length > 0;

export const samlTenantID = "Cal.com";
export const samlProductID = "Cal.com";

const samlAdmins = (process.env.SAML_ADMINS || "").split(",");
export const hostedCal = process.env.NEXT_PUBLIC_APP_URL === "https://cal.com";
export const tenantPrefix = "team-";

export const isSAMLAdmin = (email: string) => {
  for (const admin of samlAdmins) {
    if (admin.toLowerCase() === email.toLowerCase() && admin.toUpperCase() === email.toUpperCase()) {
      return true;
    }
  }

  return false;
};
