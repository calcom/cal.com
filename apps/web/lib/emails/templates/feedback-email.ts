import BaseEmail from "@lib/emails/templates/_base-email";

import { emailHead, emailBodyLogo } from "./common";

export interface Feedback {
  userId: number;
  rating: string;
  comment: string;
}

export default class FeedbackEmail extends BaseEmail {
  feedback: Feedback;

  constructor(feedback: Feedback) {
    super();
    this.feedback = feedback;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      from: `Cal.com <${this.getMailerOptions().from}>`,
      to: process.env.SEND_FEEDBACK_EMAIL,
      subject: `User Feedback`,
      html: this.getHtmlBody(),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return `
    userId: ${this.feedback.userId}
    rating: ${this.feedback.rating}
    comment: ${this.feedback.comment}
    `;
  }

  protected getHtmlBody(): string {
    return `
    <!doctype html>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
      ${emailHead("Feedback")}
    <body style="word-spacing:normal;background-color:#F5F5F5;">
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
                    <td align="center" style="font-size:0px;padding:10px 25px;padding-top:24px;padding-bottom:0px;word-break:break-word;">
                      <div style="font-family:Roboto, Helvetica, sans-serif;font-size:24px;font-weight:700;line-height:24px;text-align:center;color:#292929;">Feedback</div>
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
      <div style="background-color:#F5F5F5;">
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
                                <p style="color: #494949;">Used id</p>
                                <p style="color: #494949; font-weight: 400; line-height: 24px;">${
                                  this.feedback.userId
                                }</p>
                              </div>
                              <div style="line-height: 6px;">
                                <p style="color: #494949;">Rating</p>
                                <p style="color: #494949; font-weight: 400; line-height: 24px;">${
                                  this.feedback.rating
                                }</p>
                              </div>
                              <div style="line-height: 6px;">
                                <p style="color: #494949;">Comment</p>
                                <p style="color: #494949; font-weight: 400; line-height: 24px;">${
                                  this.feedback.comment
                                }</p>
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
        ${emailBodyLogo()}
        <!--[if mso | IE]></td></tr></table><![endif]-->
      </div>
    </body>
    </html>
    `;
  }
}
