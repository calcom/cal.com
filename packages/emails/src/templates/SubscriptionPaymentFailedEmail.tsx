import { BaseEmailHtml } from "../components";

type SubscriptionPaymentFailedEmailProps = {
  entityName: string;
  billingPortalUrl: string;
  supportEmail: string;
  language: {
    translate: (key: string, variables?: Record<string, string | number>) => string;
  };
};

export const SubscriptionPaymentFailedEmail = (props: SubscriptionPaymentFailedEmailProps) => {
  const t = props.language.translate;

  return (
    <BaseEmailHtml
      headerType="xCircle"
      subject="subscription_payment_failed_subject"
      title={t("subscription_payment_failed_title")}
      callToAction={
        props.billingPortalUrl
          ? {
              href: props.billingPortalUrl,
              text: t("update_payment_method"),
            }
          : null
      }
      subtitle={
        <>
          {t("subscription_payment_failed_description", {
            entityName: props.entityName,
          })}
        </>
      }>
      <PaymentFailedInformation {...props} />
    </BaseEmailHtml>
  );
};

function PaymentFailedInformation(props: SubscriptionPaymentFailedEmailProps) {
  const t = props.language.translate;

  return (
    <>
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
            {t("subscription_payment_failed_next_steps")}
          </div>
        </td>
      </tr>
      <tr>
        <td align="center" style={{ fontSize: "0px", padding: "10px 25px", wordBreak: "break-word" }}>
          <div
            style={{
              fontFamily: "Roboto, Helvetica, sans-serif",
              fontSize: "14px",
              fontWeight: 400,
              lineHeight: "20px",
              textAlign: "center",
              color: "#666666",
            }}>
            {t("subscription_payment_failed_contact_support", {
              supportEmail: props.supportEmail,
            })}
          </div>
        </td>
      </tr>
    </>
  );
}
