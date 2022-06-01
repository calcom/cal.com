import * as ReactDOMServer from "react-dom/server";

import { LinkIcon, RawHtml } from "../components";
import { AttendeeScheduledEmail } from "./AttendeeScheduledEmail";

function ManageLink(props: React.ComponentProps<typeof AttendeeScheduledEmail>) {
  const manageText = props.attendee.language.translate("pay_now");
  const linkIcon = ReactDOMServer.renderToStaticMarkup(<LinkIcon />);

  if (!props.calEvent.paymentInfo) return null;

  return (
    /* mso-padding-alt is not supported on JSX */
    <RawHtml
      html={`
<tr>
  <td align="center" bgcolor="#292929" role="presentation" style="border:none;border-radius:3px;cursor:auto;mso-padding-alt:10px 25px;background:#292929;" valign="middle">
    <p style="display:inline-block;background:#292929;color:#ffffff;font-family:Roboto, Helvetica, sans-serif;font-size:16px;font-weight:500;line-height:120%;margin:0;text-decoration:none;text-transform:none;padding:10px 25px;mso-padding-alt:0px;border-radius:3px;">
      <a style="color: #FFFFFF; text-decoration: none;" href="${props.calEvent.paymentInfo.link}" target="_blank">${manageText} ${linkIcon}</a>
    </p>
  </td>
</tr>
    `}
    />
  );
}

export const AttendeeAwaitingPaymentEmail = (props: React.ComponentProps<typeof AttendeeScheduledEmail>) => (
  <AttendeeScheduledEmail
    title="meeting_awaiting_payment"
    headerType="calendarCircle"
    subject="awaiting_payment_subject"
    callToAction={<ManageLink {...props} />}
    {...props}
  />
);

export default AttendeeAwaitingPaymentEmail;
