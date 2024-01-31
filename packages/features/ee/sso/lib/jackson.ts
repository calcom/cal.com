import type {
  IConnectionAPIController,
  IOAuthController,
  ISPSSOConfig,
  JacksonOption,
} from "@boxyhq/saml-jackson";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { clientSecretVerifier, oidcPath, samlAudience, samlDatabaseUrl, samlPath } from "./saml";

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
  ory: {
    projectId: undefined,
    sdkToken: undefined,
  },
};

declare global {
  /* eslint-disable no-var */
  var connectionController: IConnectionAPIController | undefined;
  var oauthController: IOAuthController | undefined;
  var samlSPConfig: ISPSSOConfig | undefined;
  /* eslint-enable no-var */
}

export default async function init() {
  if (!globalThis.connectionController || !globalThis.oauthController || !globalThis.samlSPConfig) {
    const ret = await (await import("@boxyhq/saml-jackson")).controllers(opts);
    globalThis.connectionController = ret.connectionAPIController;
    globalThis.oauthController = ret.oauthController;
    globalThis.samlSPConfig = ret.spConfig;
  }

  return {
    connectionController: globalThis.connectionController,
    oauthController: globalThis.oauthController,
    samlSPConfig: globalThis.samlSPConfig,
  };
}
