import { serverConfig } from "../serverConfig";
import nodemailer from "nodemailer";

export default function createInvitationEmail(data: any, options: any = {}) {
  return sendEmail(data, {
    provider: {
      transport: serverConfig.transport,
      from: serverConfig.from,
    },
    ...options,
  });
}

const sendEmail = (invitation: any, { provider }) =>
  new Promise((resolve, reject) => {
    const { transport, from } = provider;

    nodemailer.createTransport(transport).sendMail(
      {
        from: `Calendso <${from}>`,
        to: invitation.toEmail,
        subject:
          (invitation.from ? invitation.from + " invited you" : "You have been invited") +
          ` to join ${invitation.teamName}`,
        html: html(invitation),
        text: text(invitation),
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

const html = (invitation: any) => {
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
    ` to join the team "${invitation.teamName}" in Calendso.<br />
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
      If you prefer not to use "${invitation.toEmail}" as your Calendso email or already have a Calendso account, please request another invitation to that email.
      </td>
      </tr>
      </table>
      </center>
      </td>
      </tr>
    </table>
  `
  );
};

// just strip all HTML and convert <br /> to \n
const text = (evt: any) =>
  html(evt)
    .replace("<br />", "\n")
    .replace(/<[^>]+>/g, "");
