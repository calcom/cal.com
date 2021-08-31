import prisma from "./prisma";
//import { Credential } from "@prisma/client";
//import logger from "@lib/logger";

//const log = logger.getChildLogger({ prefix: ["[lib] externalAccountClient"] });

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { google } = require("googleapis");

const googleAuth = (credential) => {
  const { client_secret, client_id, redirect_uris } = JSON.parse(process.env.GOOGLE_API_CREDENTIALS).web;
  const myGoogleAuth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  myGoogleAuth.setCredentials(credential.key);

  const isExpired = () => myGoogleAuth.isTokenExpiring();

  const refreshAccessToken = () =>
    myGoogleAuth
      .refreshToken(credential.key.refresh_token)
      .then((res) => {
        const token = res.res.data;
        credential.key.access_token = token.access_token;
        credential.key.expiry_date = token.expiry_date;
        return prisma.credential
          .update({
            where: {
              id: credential.id,
            },
            data: {
              key: credential.key,
            },
          })
          .then(() => {
            myGoogleAuth.setCredentials(credential.key);
            return myGoogleAuth;
          });
      })
      .catch((err) => {
        console.error("Error refreshing google token", err);
        return myGoogleAuth;
      });

  return {
    getToken: () => (!isExpired() ? Promise.resolve(myGoogleAuth) : refreshAccessToken()),
  };
};

export interface IntegrationAccount {
  integration: string;
  integrationId: string;
  externalId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  firstname: string;
  lastname: string;
  link: string;
  picture: string;
  gender: string;
  locale: string;
  organizationDomain: string;
}

export interface ExternalAccountApiAdapter {
  getAccount(): Promise<IntegrationAccount>;
}

const GoogleAccount = (credential): ExternalAccountApiAdapter => {
  const auth = googleAuth(credential);
  const integrationType = "google_account";

  return {
    getAccount: () =>
      new Promise((resolve, reject) =>
        auth.getToken().then((myGoogleAuth) => {
          const account = google.oauth2({
            version: "v2",
            auth: myGoogleAuth,
          });
          account.userinfo
            .get()
            .then((apires) => {
              const acc = apires.data;
              const externalAccount: IntegrationAccount = {
                userId: credential.userId,
                externalId: acc.id,
                integration: integrationType,
                email: acc.email,
                emailVerified: acc.verified_email,
                name: acc.name,
                firstname: acc.given_name,
                lastname: acc.family_name,
                link: acc.link,
                picture: acc.picture,
                gender: acc.gender,
                locale: acc.locale,
                organizationDomain: acc.hd,
              };
              resolve(externalAccount);
            })
            .catch((err) => {
              console.error("There was an error contacting google account service: ", err);
              reject(err);
            });
        })
      ),
  };
};

// factory
const account = (withCredentials): ExternalAccountApiAdapter =>
  withCredentials
    .map((cred) => {
      switch (cred.type) {
        case "google_calendar":
          return GoogleAccount(cred);
        case "office365_calendar":
          return MicrosoftOffice365Account(cred);
        default:
          return; // unknown credential, could be legacy? In any case, ignore
      }
    })
    .filter(Boolean);

const getAccount = (withCredentials) =>
  Promise.all(account(withCredentials).map((c) => c.getAccount())).then((results) =>
    results.reduce((acc, accounts) => acc.concat(accounts), []).filter((c) => c != null)
  );

export { getAccount };
