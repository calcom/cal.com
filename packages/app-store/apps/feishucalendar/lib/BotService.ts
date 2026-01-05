import logger from "@calcom/lib/logger";

import { FEISHU_HOST } from "../common";
import { getAppAccessToken } from "./AppAccessToken";

const log = logger.getSubLogger({ prefix: [`[[FeishuTenantCredential]`] });

const msg = {
  en_us: {
    title: "Welcome to Cal.com!",
    content: [
      [
        {
          tag: "text",
          text: "Cal.com is an open source scheduling infrastructure.",
        },
      ],
      [
        {
          tag: "text",
          text: 'It allows users to send a unique "cal.com" URL that allows anyone to create bookings on their calendars',
        },
      ],
      [
        {
          tag: "text",
          text: "",
        },
      ],
      [
        {
          tag: "text",
          text: "Get started",
        },
      ],
      [
        {
          tag: "text",
          text: "1. Visit https://cal.com and sign up for an account.",
        },
      ],
      [
        {
          tag: "text",
          text: '2. Then go to "Apps" in Cal -> install ',
        },
        {
          tag: "a",
          text: '"Feishu Calendar"',
          href: "https://www.larksuite.com/hc/articles/057527702350",
        },
        {
          tag: "text",
          text: " -> sign-in via Feishu",
        },
      ],
      [
        {
          tag: "text",
          text: "3. Done. Create your Event Types and share your booking links with external participants!",
        },
      ],
      [
        {
          tag: "text",
          text: "",
        },
      ],
      [
        {
          tag: "text",
          text: "Do not hesitate to reach out to our agents if you need any assistance.",
        },
      ],
      [
        {
          tag: "a",
          text: "Get Help",
          href: "https://applink.larksuite.com/client/helpdesk/open?id=6650327445582905610",
        },
      ],
    ],
  },
};

async function getTenantAccessTokenByTenantKey(tenantKey: string): Promise<string> {
  try {
    const appAccessToken = await getAppAccessToken();
    const resp = await fetch(`https://${FEISHU_HOST}/open-apis/auth/v3/tenant_access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_access_token: appAccessToken,
        tenant_key: tenantKey,
      }),
    });
    const data = await resp.json();
    return data.tenant_access_token;
  } catch (error) {
    log.error(error);
    throw error;
  }
}

export async function sendPostMsg(
  tenantKey: string,
  senderOpenId: string,
  message: string = JSON.stringify(msg)
): Promise<{ code: number; msg: string }> {
  const tenantAccessToken = await getTenantAccessTokenByTenantKey(tenantKey);

  const response = await fetch(`https://${FEISHU_HOST}/open-apis/im/v1/messages?receive_id_type=open_id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tenantAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      receive_id: senderOpenId,
      content: message,
      msg_type: "post",
    }),
  });

  const responseBody = await response.json();
  log.debug("send message success", responseBody);
  return responseBody;
}
