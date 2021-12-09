export const samlLoginUrl = process.env.SAML_LOGIN_URL;
export const samlApiUrl = process.env.SAML_API_URL;

export const isSAMLLoginEnabled = !!samlLoginUrl;

export const samlTenantID = "Cal.com";
export const samlProductID = "Cal.com";

export const samlServiceApiKey = (process.env.JACKSON_API_KEYS || "").split(",")[0];

const samlAdmins = (process.env.SAML_ADMINS || "").split(",");
export const hostedCal = isSAMLLoginEnabled && samlAdmins.length === 0;

export const isSAMLAdmin = (email: string) => {
  for (const admin of samlAdmins) {
    if (admin.toLowerCase() === email.toLowerCase() && admin.toUpperCase() === email.toUpperCase()) {
      return true;
    }
  }

  return false;
};
