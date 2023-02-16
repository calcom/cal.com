import jackson, {
  IConnectionAPIController,
  IOAuthController,
  JacksonOption,
  ISPSAMLConfig,
} from "@boxyhq/saml-jackson";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { samlDatabaseUrl, samlAudience, samlPath, oidcPath } from "./saml";

// Set the required options. Refer to https://github.com/boxyhq/jackson#configuration for the full list
const opts: JacksonOption = {
  externalUrl: WEBAPP_URL,
  samlPath,
  samlAudience,
  oidcPath,
  db: {
    engine: "sql",
    type: "postgres",
    url: samlDatabaseUrl,
    encryptionKey: process.env.CALENDSO_ENCRYPTION_KEY,
  },
};

let connectionController: IConnectionAPIController;
let oauthController: IOAuthController;
let samlSPConfig: ISPSAMLConfig;

const g = global as any;

export default async function init() {
  if (!g.connectionController || !g.oauthController) {
    const ret = await jackson(opts);

    connectionController = ret.connectionAPIController;
    oauthController = ret.oauthController;
    samlSPConfig = ret.spConfig;

    g.connectionController = connectionController;
    g.oauthController = oauthController;
    g.samlSPConfig = samlSPConfig;
  } else {
    connectionController = g.connectionController;
    oauthController = g.oauthController;
    samlSPConfig = g.samlSPConfig;
  }

  return {
    connectionController,
    oauthController,
    samlSPConfig,
  };
}
