import jackson, { IConnectionAPIController, IOAuthController, JacksonOption } from "@boxyhq/saml-jackson";

import { WEBAPP_URL } from "@calcom/lib/constants";

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
  oidcPath: "/abc",
  openid: {},
};

let connectionController: IConnectionAPIController;
let oauthController: IOAuthController;

const g = global as any;

export default async function init() {
  if (!g.connectionController || !g.oauthController) {
    const ret = await jackson(opts);

    connectionController = ret.connectionAPIController;
    oauthController = ret.oauthController;

    g.connectionController = connectionController;
    g.oauthController = oauthController;
  } else {
    connectionController = g.connectionController;
    oauthController = g.oauthController;
  }

  return {
    connectionController,
    oauthController,
  };
}
