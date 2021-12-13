import jackson from "@boxyhq/saml-jackson";

import { BASE_URL } from "@lib/config/constants";
import { samlDatabaseUrl } from "@lib/saml";

// Set the required options. Refer to https://github.com/boxyhq/jackson#configuration for the full list
const opts = {
  externalUrl: BASE_URL,
  samlPath: "/api/auth/saml/callback",
  db: {
    engine: "sql",
    type: "postgres",
    url: samlDatabaseUrl,
  },
};

let apiController: any;
let oauthController: any;

export default async function init() {
  if (!global.apiController || !global.oauthController) {
    const ret = await jackson(opts);
    apiController = ret.apiController;
    oauthController = ret.oauthController;
    global.apiController = apiController;
    global.oauthController = oauthController;
  } else {
    apiController = global.apiController;
    oauthController = global.oauthController;
  }

  return {
    apiController,
    oauthController,
  };
}
