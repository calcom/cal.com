import { BaseEmailHtml } from "../components";
import type { OrganizerScheduledEmail } from "./OrganizerScheduledEmail";

export const OrganizerPaymentRefundFailedEmail = (
  props: React.ComponentProps<typeof OrganizerScheduledEmail>
) => {
  const t = props.calEvent.organizer.language.translate;

  return (
    <BaseEmailHtml
      headerType="xCircle"
      subject="refund_failed_subject"
      title={t("a_refund_failed")}
      callToAction={null}
      subtitle={
        <>
          {t("check_with_provider_and_user", {
            user: props.calEvent.attendees[0].name,
          })}
        </>
      }>
      <RefundInformation {...props} />
    </BaseEmailHtml>
  );
};

function RefundInformation(props: React.ComponentProps<typeof OrganizerPaymentRefundFailedEmail>) {
  const { paymentInfo } = props.calEvent;
  const t = props.calEvent.organizer.language.translate;

  if (!paymentInfo) return null;

  return (
    <>
      {paymentInfo.reason && (
        <tr>
          <td align="center" style={{ fontSize: "0px", padding: "10px 25px", wordBreak: "break-word" }}>
            <div
              style={{
                fontFamily: "Roboto, Helvetica, sans-serif",
                fontSize: "16px",
                fontWeight: 400,
                lineHeight: "24px",
                textAlign: "center",
                color: "#494949",
              }}>
              {t("error_message", { errorMessage: paymentInfo.reason }).toString()}
            </div>
          </td>
        </tr>
      )}
      {paymentInfo.id && (
        <tr>
          <td align="center" style={{ fontSize: "0px", padding: "10px 25px", wordBreak: "break-word" }}>
            <div
              style={{
                fontFamily: "Roboto, Helvetica, sans-serif",
                fontSize: "16px",
                fontWeight: 400,
                lineHeight: "24px",
                textAlign: "center",
                color: "#494949",
              }}>
              Payment {paymentInfo.id}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
