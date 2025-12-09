import type BaseEmail from "@calcom/emails/templates/_base-email";

import type { OAuthClientNotification } from "./templates/admin-oauth-client-notification";
import AdminOAuthClientNotification from "./templates/admin-oauth-client-notification";
import type { OAuthClientApprovedNotification } from "./templates/oauth-client-approved-notification";
import OAuthClientApprovedEmail from "./templates/oauth-client-approved-notification";

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
