import axios from "axios";
import * as crypto from "node:crypto";

export interface FlexibleEmail {
  name?: string;
  email: string;
}

export enum TagsEnum {
  isReminder = "isReminder",
  isOpsCritical = "isOpsCritical",
  normal = "normal",
}

export interface EmailDetails {
  from?: string | FlexibleEmail;
  recipients: (string | FlexibleEmail)[];
  cc?: (string | FlexibleEmail)[];
  bcc?: (string | FlexibleEmail)[];
  subject: string;
  sensitive: boolean;
  tag: TagsEnum;
  emailContent?: {
    text: any;
    html: any;
  };
}

type SendMailRequest = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

async function generateAuthCRMToken(): Promise<{ token: string; tokenForAuthHeader: string }> {
  const zohoCrmSecretKey = process.env.ZOHO_CRM_SECRET_KEY || "";

  const zohoUserDetails = { id: 1 };

  const nowTimestamp = Date.now();
  const data = `${nowTimestamp}|${JSON.stringify(zohoUserDetails)}`;

  const signature = crypto.createHmac("sha1", zohoCrmSecretKey).update(data).digest("base64");
  const signatureWithData = `${signature}|${data}`;
  const token = Buffer.from(signatureWithData).toString("base64");

  return {
    token,
    tokenForAuthHeader: `Bearer ${token}`,
  };
}

export const sendMail = async (params: SendMailRequest) => {
  const emailServerUrl = `${process.env.PROJECT_SERVER_BASE_URL}/package/email-logs/email/sendEmail`;

  const data = {
    from: params.from,
    recipients: [params.to],
    subject: params.subject,
    sensitive: false,
    tag: TagsEnum.isOpsCritical,
    emailContent: {
      html: params.html,
    },
  };

  const { data: response } = await axios.request({
    method: "post",
    url: emailServerUrl,
    headers: {
      Authorization: (await generateAuthCRMToken()).tokenForAuthHeader,
    },
    data,
  });
  console.log({ response });

  return response;
};
