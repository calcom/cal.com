import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import { LARK_HOST, getAppKeys, isValidString, isExpired } from "../common";

const log = logger.getChildLogger({ prefix: [`[[LarkAppCredential]`] });

function makePoolingPromise<T>(
  promiseCreator: () => Promise<T | null>,
  times = 4,
  delay = 30 * 1000
): Promise<T | null> {
  return new Promise((resolve, reject) => {
    promiseCreator()
      .then(resolve)
      .catch((err) => {
        if (times <= 0) {
          reject(err);
          return;
        }
        setTimeout(() => {
          makePoolingPromise(promiseCreator, times - 1, delay)
            .then(resolve)
            .catch(reject);
        }, delay);
      });
  });
}

const getValidAppKeys = async (): Promise<ReturnType<typeof getAppKeys>> => {
  const appKeys = await getAppKeys();
  if (!isValidString(appKeys.app_id)) throw Error("lark app_id missing.");
  if (!isValidString(appKeys.app_secret)) throw Error("lark app_secret missing.");
  return appKeys;
};

const getAppTicketFromKeys = async (): Promise<string> => {
  const appKeys = await getValidAppKeys();
  const appTicketNew = appKeys?.app_ticket;
  if (appTicketNew) {
    return appTicketNew;
  }
  throw Error("lark appTicketNew not found in getAppTicketFromKeys");
};

const getAppTicket = async (): Promise<string> => {
  log.debug("get app ticket invoked");
  const appKeys = await getValidAppKeys();

  if (typeof appKeys.app_ticket === "string" && appKeys.app_ticket !== "") {
    log.debug("has app ticket", appKeys.app_ticket);
    return appKeys.app_ticket;
  }

  /**
   * Trigger app-ticket resend. app ticket can only be obtained from
   * app_ticket event.
   * see https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/application-v6/event/app_ticket-events
   */
  log.info("Invoke app-ticket resend", appKeys.app_ticket);
  fetch(`https://${LARK_HOST}/open-apis/auth/v3/app_ticket/resend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: appKeys.app_id,
      app_secret: appKeys.app_secret,
    }),
  });

  const appTicketNew = await makePoolingPromise(getAppTicketFromKeys);
  if (appTicketNew) {
    log.debug("has new app ticket", appTicketNew);
    return appTicketNew;
  }
  log.error("app ticket not found");
  throw new Error("No app ticket found");
};

export const getAppAccessToken: () => Promise<string> = async () => {
  log.debug("get app access token invoked");
  const appKeys = await getValidAppKeys();
  const appAccessToken = appKeys.app_access_token;
  const expireDate = appKeys.expire_date;

  if (appAccessToken && expireDate && !isExpired(expireDate)) {
    log.debug("get app access token not expired", appAccessToken);
    return appAccessToken;
  }

  const appTicket = await getAppTicket();

  const fetchAppAccessToken = (app_ticket: string) =>
    fetch(`https://${LARK_HOST}/open-apis/auth/v3/app_access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: appKeys.app_id,
        app_secret: appKeys.app_secret,
        app_ticket,
      }),
    });

  const resp = await fetchAppAccessToken(appTicket);
  const data = await resp.json();

  if (!resp.ok || data.code !== 0) {
    logger.error("lark error with error: ", data, ", logid is:", resp.headers.get("X-Tt-Logid"));
    // appticket invalid, mostly outdated, delete and renew one
    if (data.code === 10012) {
      await prisma.app.update({
        where: { slug: "lark-calendar" },
        data: { keys: { ...appKeys, app_ticket: "" } },
      });
      return getAppAccessToken();
    }
  }

  const newAppAccessToken = data.app_access_token;
  const newExpireDate = Math.round(Number(new Date()) / 1000 + data.expire);

  await prisma.app.update({
    where: { slug: "lark-calendar" },
    data: {
      keys: {
        ...appKeys,
        appAccessToken: newAppAccessToken,
        expireDate: newExpireDate,
      },
    },
  });

  return newAppAccessToken;
};
