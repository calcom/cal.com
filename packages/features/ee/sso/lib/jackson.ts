import jackson from "@boxyhq/saml-jackson";
import type {
  IConnectionAPIController,
  IOAuthController,
  JacksonOption,
  ISPSAMLConfig,
} from "@boxyhq/saml-jackson";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { samlDatabaseUrl, samlAudience, samlPath, oidcPath, clientSecretVerifier } from "./saml";

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
  idpEnabled: true,
  clientSecretVerifier,
};

let connectionControllerLocal: IConnectionAPIController;
let oauthControllerLocal: IOAuthController;
let samlSPConfigLocal: ISPSAMLConfig;

const g = global;

declare global {
  /* eslint-disable no-var */
  var connectionController: IConnectionAPIController | undefined;
  var oauthController: IOAuthController | undefined;
  var samlSPConfig: ISPSAMLConfig | undefined;
  /* eslint-enable no-var */
}

export default async function init() {
  if (!g.connectionController || !g.oauthController || !g.samlSPConfig) {
    const ret = await jackson(opts);

    connectionControllerLocal = ret.connectionAPIController;
    oauthControllerLocal = ret.oauthController;
    samlSPConfigLocal = ret.spConfig;
    g.connectionController = connectionControllerLocal;
    g.oauthController = oauthControllerLocal;
    g.samlSPConfig = samlSPConfigLocal;
  } else {
    connectionControllerLocal = g.connectionController;
    oauthControllerLocal = g.oauthController;
    samlSPConfigLocal = g.samlSPConfig;
  }
  return {
    connectionControllerLocal,
    oauthControllerLocal,
    samlSPConfigLocal,
  };
}
