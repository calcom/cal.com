import { z } from "zod";

import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import { getAppKeys, isExpired, FEISHU_HOST } from "../common";

const log = logger.getSubLogger({ prefix: [`[[FeishuAppCredential]`] });

function makePoolingPromise<T>(
  promiseCreator: () => Promise<T | null>,
  times = 24,
  delay = 5 * 1000
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

const appKeysSchema = z.object({
  app_id: z.string().min(1),
  app_secret: z.string().min(1),
  app_access_token: z.string().optional(),
  app_ticket: z.string().optional(),
  expire_date: z.number().optional(),
  open_verification_token: z.string().min(1),
});

const getValidAppKeys = async (): Promise<ReturnType<typeof getAppKeys>> => {
  const appKeys = await getAppKeys();
  const validAppKeys = appKeysSchema.parse(appKeys);
  return validAppKeys;
};

const getAppTicketFromKeys = async (): Promise<string> => {
  const appKeys = await getValidAppKeys();
  const appTicketNew = appKeys?.app_ticket;
  if (appTicketNew) {
    return appTicketNew;
  }
  throw Error("feishu appTicketNew not found in getAppTicketFromKeys");
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

  fetch(`https://${FEISHU_HOST}/open-apis/auth/v3/app_ticket/resend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: appKeys.app_id,
      app_secret: appKeys.app_secret,
    }),
  });

  /**
   * 1. App_ticket is only valid for 1 hr.
   * 2. The we cannot retrieve app_ticket by calling a API.
   * 3. App_ticket can only be retrieved in app_ticket event, which is push from feishu every hour.
   * 4. We can trigger feishu to push a new app_ticket
   * 5. Therefore, after trigger resend app_ticket ticket, we have to
   * pooling DB, as app_ticket will update ticket in DB
   * see
   * https://open.larksuite.com/document/ugTN1YjL4UTN24CO1UjN/uQjN1YjL0YTN24CN2UjN
   * https://open.larksuite.com/document/ukTMukTMukTM/ukDNz4SO0MjL5QzM/auth-v3/auth/app_ticket_resend
   */
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
    log.debug("get app access token not expired");
    return appAccessToken;
  }

  const appTicket = await getAppTicket();

  const fetchAppAccessToken = (app_ticket: string) =>
    fetch(`https://${FEISHU_HOST}/open-apis/auth/v3/app_access_token`, {
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
    logger.error("feishu error with error: ", data, ", logid is:", resp.headers.get("X-Tt-Logid"));
    // appticket invalid, mostly outdated, delete and renew one
    if (data.code === 10012) {
      await prisma.app.update({
        where: { slug: "feishu-calendar" },
        data: { keys: { ...appKeys, app_ticket: "" } },
      });
      throw new Error("app_ticket invalid, please try again");
    }
  }

  const newAppAccessToken = data.app_access_token;
  const newExpireDate = Math.round(Number(new Date()) / 1000 + data.expire);

  await prisma.app.update({
    where: { slug: "feishu-calendar" },
    data: {
      keys: {
        ...appKeys,
        app_access_token: newAppAccessToken,
        expire_date: newExpireDate,
      },
    },
  });

  return newAppAccessToken;
};
