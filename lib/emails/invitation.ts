import nodemailer from "nodemailer";

import { serverConfig } from "../serverConfig";

export type Invitation = {
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

    const invitationHtml = html(invitation);
    nodemailer.createTransport(transport).sendMail(
      {
        from: `Cal.com <${from}>`,
        to: invitation.toEmail,
        subject:
          (invitation.from ? invitation.from + " invited you" : "You have been invited") +
          ` to join ${invitation.teamName}`,
        html: invitationHtml,
        text: text(invitationHtml),
      },
      (error) => {
        if (error) {
          console.error("SEND_INVITATION_NOTIFICATION_ERROR", invitation.toEmail, error);
          return reject(new Error(error));
        }
        return resolve();
      }
    );
  });

export function html(invitation: Invitation): string {
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
      Hi,<br />
      <br />` +
    (invitation.from ? invitation.from + " invited you" : "You have been invited") +
    ` to join the team "${invitation.teamName}" in Cal.com.<br />
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
                <a href="${url}" style="display: inline-block; mso-hide:all; background-color: #19cca3; color: #FFFFFF; border:1px solid #19cca3; border-radius: 6px; line-height: 220%; width: 200px; font-family: Helvetica, sans-serif; font-size:18px; font-weight:600; text-align: center; text-decoration: none; -webkit-text-size-adjust:none;  " target="_blank">Join team</a>
                </a>
              </div>
          </td>
        </tr>
      </table><br />
      If you prefer not to use "${invitation.toEmail}" as your Cal.com email or already have a Cal.com account, please request another invitation to that email.
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
