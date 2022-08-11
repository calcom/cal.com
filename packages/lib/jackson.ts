import jackson, { IAPIController, IOAuthController, JacksonOption } from "@boxyhq/saml-jackson";

import { WEBAPP_URL } from "./constants";
import { samlDatabaseUrl } from "./saml";

// Set the required options. Refer to https://github.com/boxyhq/jackson#configuration for the full list
const opts: JacksonOption = {
  externalUrl: WEBAPP_URL,
  samlPath: "/api/auth/saml/callback",
  db: {
    engine: "sql",
    type: "postgres",
    url: samlDatabaseUrl,
    encryptionKey: process.env.CALENDSO_ENCRYPTION_KEY,
  },
  samlAudience: "https://saml.cal.com",
};

let apiController: IAPIController;
let oauthController: IOAuthController;

const g = global as any;

export default async function init() {
  if (!g.apiController || !g.oauthController) {
    const ret = await jackson(opts);
    apiController = ret.apiController;
    oauthController = ret.oauthController;
    g.apiController = apiController;
    g.oauthController = oauthController;
  } else {
    apiController = g.apiController;
    oauthController = g.oauthController;
  }

  return {
    apiController,
    oauthController,
  };
}
