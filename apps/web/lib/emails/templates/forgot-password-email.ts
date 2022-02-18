import { TFunction } from "next-i18next";
import nodemailer from "nodemailer";

import { getErrorFromUnknown } from "@lib/errors";
import { serverConfig } from "@lib/serverConfig";

import { emailHead, linkIcon, emailBodyLogo } from "./common";

export type PasswordReset = {
  language: TFunction;
  user: {
    name?: string | null;
    email: string;
  };
  resetLink: string;
};

export const PASSWORD_RESET_EXPIRY_HOURS = 6;

export default class ForgotPasswordEmail {
  passwordEvent: PasswordReset;

  constructor(passwordEvent: PasswordReset) {
    this.passwordEvent = passwordEvent;
  }

  public sendEmail() {
    new Promise((resolve, reject) =>
      nodemailer
        .createTransport(this.getMailerOptions().transport)
        .sendMail(this.getNodeMailerPayload(), (_err, info) => {
          if (_err) {
            const err = getErrorFromUnknown(_err);
            this.printNodeMailerError(err);
            reject(err);
          } else {
            resolve(info);
          }
        })
    ).catch((e) => console.error("sendEmail", e));
    return new Promise((resolve) => resolve("send mail async"));
  }

  protected getMailerOptions() {
    return {
      transport: serverConfig.transport,
      from: serverConfig.from,
    };
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: `${this.passwordEvent.user.name} <${this.passwordEvent.user.email}>`,
      from: `Cal.com <${this.getMailerOptions().from}>`,
      subject: this.passwordEvent.language("reset_password_subject"),
      html: this.getHtmlBody(),
      text: this.getTextBody(),
    };
  }

  protected printNodeMailerError(error: Error): void {
    console.error("SEND_PASSWORD_RESET_EMAIL_ERROR", this.passwordEvent.user.email, error);
  }

  protected getTextBody(): string {
    return `
${this.passwordEvent.language("reset_password_subject")}
${this.passwordEvent.language("hi_user_name", { user: this.passwordEvent.user.name })},
${this.passwordEvent.language("someone_requested_password_reset")}
${this.passwordEvent.language("change_password")}: ${this.passwordEvent.resetLink}
${this.passwordEvent.language("password_reset_instructions")}
${this.passwordEvent.language("have_any_questions")} ${this.passwordEvent.language(
      "contact_our_support_team"
    )}
`.replace(/(<([^>]+)>)/gi, "");
  }

  protected getHtmlBody(): string {
    const headerContent = this.passwordEvent.language("reset_password_subject");
    return `
    <!doctype html>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    ${emailHead(headerContent)}
    <body style="word-spacing:normal;background-color:#F5F5F5;">
      <div style="background-color:#F5F5F5;">
        ${emailBodyLogo()}
        <!--[if mso | IE]></td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
        <div style="margin:0px auto;max-width:600px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
            <tbody>
              <tr>
                <td style="direction:ltr;font-size:0px;padding:0px;padding-top:40px;text-align:center;">
                  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr></tr></table><![endif]-->
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!--[if mso | IE]></td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" bgcolor="#FFFFFF" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
        <div style="background:#FFFFFF;background-color:#FFFFFF;margin:0px auto;max-width:600px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;background-color:#FFFFFF;width:100%;">
            <tbody>
              <tr>
                <td style="border-left:1px solid #E1E1E1;border-right:1px solid #E1E1E1;border-top:1px solid #E1E1E1;direction:ltr;font-size:0px;padding:30px 20px 0 20px;text-align:center;">
                  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr></tr></table><![endif]-->
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!--[if mso | IE]></td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" bgcolor="#FFFFFF" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
        <div style="background:#FFFFFF;background-color:#FFFFFF;margin:0px auto;max-width:600px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;background-color:#FFFFFF;width:100%;">
            <tbody>
              <tr>
                <td style="border-left:1px solid #E1E1E1;border-right:1px solid #E1E1E1;direction:ltr;font-size:0px;padding:0px;text-align:center;">
                  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:598px;" ><![endif]-->
                  <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                      <tbody>
                        <tr>
                          <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                            <div style="font-family:Roboto, Helvetica, sans-serif;font-size:16px;font-weight:500;line-height:1;text-align:left;color:#3E3E3E;">
                              <div style="line-height: 6px;">
                                <p>${this.passwordEvent.language("hi_user_name", {
                                  user: this.passwordEvent.user.name,
                                })},</p>
                                <p style="font-weight: 400; line-height: 24px;">${this.passwordEvent.language(
                                  "someone_requested_password_reset"
                                )}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td align="left" vertical-align="middle" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
                              <tr>
                                <td align="center" bgcolor="#292929" role="presentation" style="border:none;border-radius:3px;cursor:auto;mso-padding-alt:10px 25px;background:#292929;" valign="middle">
                                  <p style="display:inline-block;background:#292929;color:#292929;font-family:Roboto, Helvetica, sans-serif;font-size:13px;font-weight:normal;line-height:120%;margin:0;text-decoration:none;text-transform:none;padding:10px 25px;mso-padding-alt:0px;border-radius:3px;">
                                    <a href="${
                                      this.passwordEvent.resetLink
                                    }" target="_blank" style="color: #FFFFFF; text-decoration: none">${this.passwordEvent.language(
      "change_password"
    )} <img src="${linkIcon()}" width="12px"></img></a>
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <!--[if mso | IE]></td></tr></table><![endif]-->
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!--[if mso | IE]></td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" bgcolor="#FFFFFF" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
        <div style="background:#FFFFFF;background-color:#FFFFFF;margin:0px auto;max-width:600px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;background-color:#FFFFFF;width:100%;">
            <tbody>
              <tr>
                <td style="border-left:1px solid #E1E1E1;border-right:1px solid #E1E1E1;direction:ltr;font-size:0px;padding:0px;text-align:center;">
                  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:598px;" ><![endif]-->
                  <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                      <tbody>
                        <tr>
                          <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                            <div style="font-family:Roboto, Helvetica, sans-serif;font-size:16px;font-weight:500;line-height:1;text-align:left;color:#3E3E3E;">
                              <div style="line-height: 6px;">
                                <p style="font-weight: 400; line-height: 24px;">${this.passwordEvent.language(
                                  "password_reset_instructions"
                                )}</p>
                              </div>
                              <p style="height: 6px"></p>
                              <div style="line-height: 6px;">
                                <p style="font-weight: 400; line-height: 24px;">${this.passwordEvent.language(
                                  "have_any_questions"
                                )} <a href="mailto:support@cal.com" style="color: #3E3E3E" target="_blank">${this.passwordEvent.language(
      "contact_our_support_team"
    )}</a></p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <!--[if mso | IE]></td></tr></table><![endif]-->
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!--[if mso | IE]></td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" bgcolor="#FFFFFF" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
        <div style="background:#FFFFFF;background-color:#FFFFFF;margin:0px auto;max-width:600px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;background-color:#FFFFFF;width:100%;">
            <tbody>
              <tr>
                <td style="border-bottom:1px solid #E1E1E1;border-left:1px solid #E1E1E1;border-right:1px solid #E1E1E1;direction:ltr;font-size:0px;padding:0px;text-align:center;">
                  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr></tr></table><![endif]-->
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!--[if mso | IE]></td></tr></table><![endif]-->
      </div>
    </body>
    </html>
    `;
  }
}
