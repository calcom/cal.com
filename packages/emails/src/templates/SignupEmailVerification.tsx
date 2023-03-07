import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";

import { BaseEmailHtml, CallToAction } from "../components";

export const SignupEmailVerification = (props: { verificationToken: string; email: string }) => {
  return (
    <BaseEmailHtml>
      <p>Thank you for signing up to {APP_NAME}</p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        Please verify your email address by clicking the button below.
      </p>
      <CallToAction
        label="Verify email"
        href={`${WEBAPP_URL}/auth/email-verified?verificationToken=${props.verificationToken}&email=${props.email}`}
      />
    </BaseEmailHtml>
  );
};
