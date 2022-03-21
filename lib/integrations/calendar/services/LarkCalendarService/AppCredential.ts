import { CALENDAR_INTEGRATIONS_TYPES } from "@lib/integrations/calendar/constants/generals";
import logger from "@lib/logger";
import prisma from "@lib/prisma";

import { AppAccessTokenResp } from "../../interfaces/LarkCalendar";
import { LARK_HOST, LARK_OPEN_APP_ID, LARK_OPEN_APP_SECRET, isExpired, handleLarkError } from "./helper";

const log = logger.getChildLogger({ prefix: [`[[AppCredential] ${CALENDAR_INTEGRATIONS_TYPES.lark}`] });

export const INTEGRATION_CREDENTIAL_KEY = "lark_app_credential";

export type AppCredential = {
  appAccessToken: string;
  appTicket: string;
  expireDate: number;
};

function makePoolingPromise<T>(
  promiseCreator: () => Promise<T | null>,
  times = 4,
  delay = 30 * 1000
): Promise<T | null> {
  return new Promise((resolve, reject) => {
    promiseCreator()
      .then((value) => {
        if (value) {
          resolve(value);
        }
        if (times > 0) {
          setTimeout(() => {
            makePoolingPromise(promiseCreator, times - 1, delay)
              .then(resolve)
              .catch(reject);
          }, delay);
        }
      })
      .catch(reject);
  });
}

class LarkAppCredential {
  getAppTicket = async (): Promise<string> => {
    log.debug("get app ticket invoked");
    const credentialValue = await prisma.integrationCredential.findFirst({
      where: {
        key: INTEGRATION_CREDENTIAL_KEY,
      },
    });
    const appTicket = (credentialValue?.value as AppCredential)?.appTicket;

    if (appTicket) {
      log.debug("has app ticket", appTicket);
      return appTicket;
    }

    /**
     * Trigger app-ticket resend. app ticket can only be obtained from
     * app_ticket event.
     * see https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/application-v6/event/app_ticket-events
     */
    log.info("Invoke app-ticket resend", appTicket);
    fetch(`https://${LARK_HOST}/open-apis/auth/v3/app_ticket/resend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: LARK_OPEN_APP_ID,
        app_secret: LARK_OPEN_APP_SECRET,
      }),
    });

    const requestGenerator = () =>
      prisma.integrationCredential.findFirst({
        where: {
          key: INTEGRATION_CREDENTIAL_KEY,
        },
      });

    const credentialValueNew = await makePoolingPromise(requestGenerator);
    const appTicketNew = (credentialValueNew?.value as AppCredential)?.appTicket;
    if (appTicketNew) {
      log.debug("has new app ticket", appTicketNew);
      return appTicketNew;
    }
    log.error("app ticket not found");
    throw new Error("No app ticket found");
  };

  // throw error directly
  getAppAccessToken = async () => {
    log.debug("get app access token invoked");
    const credentialValue = await prisma.integrationCredential.findFirst({
      where: {
        key: INTEGRATION_CREDENTIAL_KEY,
      },
    });
    const appAccessToken = (credentialValue?.value as AppCredential)?.appAccessToken;
    const expireDate = (credentialValue?.value as AppCredential)?.expireDate;

    if (!isExpired(expireDate) && appAccessToken) {
      log.debug("get app access token not expired", appAccessToken);
      return appAccessToken;
    }

    const appTicket = await this.getAppTicket();
    const resp = await fetch(`https://${LARK_HOST}/open-apis/auth/v3/app_access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: LARK_OPEN_APP_ID,
        app_secret: LARK_OPEN_APP_SECRET,
        app_ticket: appTicket,
      }),
    });
    const data = await handleLarkError<AppAccessTokenResp>(resp, log);

    const newAppAccessToken = data.app_access_token;
    const newExpireDate = Math.round(Number(new Date()) / 1000 + data.expire);

    const credential: AppCredential = {
      appAccessToken: newAppAccessToken,
      appTicket,
      expireDate: newExpireDate,
    };

    await prisma.integrationCredential.upsert({
      create: {
        key: INTEGRATION_CREDENTIAL_KEY,
        value: credential,
      },
      update: {
        value: credential,
      },
      where: {
        key: INTEGRATION_CREDENTIAL_KEY,
      },
    });

    return newAppAccessToken;
  };
}

export default new LarkAppCredential();
