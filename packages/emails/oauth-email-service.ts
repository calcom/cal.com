import type BaseEmail from "@calcom/emails/templates/_base-email";

import type { OAuthClientNotification } from "./templates/admin-oauth-client-notification";
import AdminOAuthClientNotification from "./templates/admin-oauth-client-notification";
import type { OAuthClientApprovedNotification } from "./templates/oauth-client-approved-notification";
import OAuthClientApprovedEmail from "./templates/oauth-client-approved-notification";
import type { OAuthClientRejectedNotification } from "./templates/oauth-client-rejected-notification";
import OAuthClientRejectedEmail from "./templates/oauth-client-rejected-notification";

const sendEmail = (prepare: () => BaseEmail) => {
  return new Promise((resolve, reject) => {
    try {
      const email = prepare();
      resolve(email.sendEmail());
    } catch (e) {
      reject(console.error(`${prepare.constructor.name}.sendEmail failed`, e));
    }
  });
};

export const sendAdminOAuthClientNotification = async (input: OAuthClientNotification) => {
  await sendEmail(() => new AdminOAuthClientNotification(input));
};

export const sendOAuthClientApprovedNotification = async (input: OAuthClientApprovedNotification) => {
  await sendEmail(() => new OAuthClientApprovedEmail(input));
};

export const sendOAuthClientRejectedNotification = async (input: OAuthClientRejectedNotification) => {
  await sendEmail(() => new OAuthClientRejectedEmail(input));
};
