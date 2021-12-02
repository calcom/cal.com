export const samlLoginUrl = process.env.SAML_LOGIN_URL;
export const samlApiUrl = process.env.SAML_API_URL;

export const isSAMLLoginEnabled = !!samlLoginUrl;

export const samlTenantID = process.env.SAML_TENANT_ID || "Cal.com";
export const samlProductID = process.env.SAML_PRODUCT_ID || "Cal.com";

export const samlServiceApiKey = (process.env.JACKSON_API_KEYS || "").split(",")[0];

const samlAdmins = (process.env.SAML_ADMINS || "").split(",");
export const isSAMLAdmin = (email: string) => {
  for (const admin of samlAdmins) {
    if (admin.toLowerCase() === email.toLowerCase() && admin.toUpperCase() === email.toUpperCase()) {
      return true;
    }
  }

  return false;
};
