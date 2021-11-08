import { TFunction } from "next-i18next";
import nodemailer from "nodemailer";

import { getErrorFromUnknown } from "@lib/errors";

import { serverConfig } from "../serverConfig";

export type Invitation = {
  language: TFunction;
  from?: string;
  toEmail: string;
  teamName: string;
  token?: string;
};

type EmailProvider = {
  from: string;
  transport: any;
};

export function createInvitationEmail(data: Invitation) {
  const provider = {
    transport: serverConfig.transport,
    from: serverConfig.from,
  } as EmailProvider;
  return sendEmail(data, provider);
}

const sendEmail = (invitation: Invitation, provider: EmailProvider): Promise<void> =>
  new Promise((resolve, reject) => {
    const { transport, from } = provider;

    const { language: t } = invitation;
    const invitationHtml = html(invitation);
    nodemailer.createTransport(transport).sendMail(
      {
        from: `Cal.com <${from}>`,
        to: invitation.toEmail,
        subject: invitation.from
          ? t("user_invited_you", { user: invitation.from, teamName: invitation.teamName })
          : t("you_have_been_invited", { teamName: invitation.teamName }),
        html: invitationHtml,
        text: text(invitationHtml),
      },
      (_err) => {
        if (_err) {
          const err = getErrorFromUnknown(_err);
          console.error("SEND_INVITATION_NOTIFICATION_ERROR", invitation.toEmail, err);
          reject(err);
          return;
        }
        return resolve();
      }
    );
  });

export function html(invitation: Invitation): string {
  const { language: t } = invitation;
  let url: string = process.env.BASE_URL + "/settings/teams";
  if (invitation.token) {
    url = `${process.env.BASE_URL}/auth/signup?token=${invitation.token}&callbackUrl=${url}`;
  }

  return (
    `
    <table style="width: 100%;">
    <tr>
      <td>
        <center>
        <table style="width: 640px; border: 1px solid gray; padding: 15px; margin: 0 auto; text-align: left;">
        <tr>
        <td>
      ${t("hi")},<br />
      <br />` +
    (invitation.from
      ? t("user_invited_you", { user: invitation.from, teamName: invitation.teamName })
      : t("you_have_been_invited", { teamName: invitation.teamName })) +
    `<br />
      <br />
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
        <tr>
          <td>
            <div>
              <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:40px;v-text-anchor:middle;width:130px;" arcsize="5%" strokecolor="#19cca3" fillcolor="#19cca3;width: 130;">
                   <w:anchorlock/>
                   <center style="color:#ffffff;font-family:Helvetica, sans-serif;font-size:18px; font-weight: 600;">Join team</center>
                 </v:roundrect>
              <![endif]-->
                <a href="${url}" style="display: inline-block; mso-hide:all; background-color: #19cca3; color: #FFFFFF; border:1px solid #19cca3; border-radius: 6px; line-height: 220%; width: 200px; font-family: Helvetica, sans-serif; font-size:18px; font-weight:600; text-align: center; text-decoration: none; -webkit-text-size-adjust:none;  " target="_blank">${t(
      "join_team"
    )}</a>
                </a>
              </div>
          </td>
        </tr>
      </table><br />
      ${t("request_another_invitation_email", { toEmail: invitation.toEmail })}
      </td>
      </tr>
      </table>
      </center>
      </td>
      </tr>
    </table>
  `
  );
}

// just strip all HTML and convert <br /> to \n
export function text(htmlStr: string): string {
  return htmlStr.replace("<br />", "\n").replace(/<[^>]+>/g, "");
}
