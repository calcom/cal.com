import { IS_PRODUCTION } from "@calcom/lib/constants";

//see https://docs.adyen.com/development-resources/oauth/integration/#step-21-construct-the-access-grant-url
export const ADYEN_OAUTH_CONNECT_BASE_URL = IS_PRODUCTION
  ? `https://ca-live.adyen.com/ca/ca/oauth/connect.shtml`
  : `https://ca-test.adyen.com/ca/ca/oauth/connect.shtml`;

//see https://docs.adyen.com/development-resources/oauth/integration/#step-3-get-your-access-and-refresh-tokens
export const OAUTH_API_VERSION = "v1";
export const ADYEN_OAUTH_API_BASE_URL = IS_PRODUCTION
  ? `https://oauth-live.adyen.com/${OAUTH_API_VERSION}`
  : `https://oauth-test.adyen.com/${OAUTH_API_VERSION}`;

//see https://docs.adyen.com/development-resources/live-endpoints/#live-endpoints-structure
export const CHECKOUT_API_VERSION = "v71";
export const getAdyenCheckoutApiBaseUrl = (liveUrlPrefix: string) =>
  IS_PRODUCTION
    ? `https://${liveUrlPrefix}-checkout-live.adyenpayments.com/checkout/${CHECKOUT_API_VERSION}`
    : `https://checkout-test.adyen.com/${CHECKOUT_API_VERSION}`;

export const MANAGEMENT_API_VERSION = "v3";
export const ADYEN_MANAGEMENT_API_BASE_URL = IS_PRODUCTION
  ? `https://management-live.adyen.com/${MANAGEMENT_API_VERSION}`
  : `https://management-test.adyen.com/${MANAGEMENT_API_VERSION}`;
