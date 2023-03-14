import { APP_NAME, WEBAPP_URL, LOGO } from "@calcom/lib/constants";

import { V2BaseEmailHtml, CallToAction } from "../components";

export const SignupEmailVerification = (props: { verificationToken: string; email: string }) => {
  return (
    <V2BaseEmailHtml>
      <img className="mt-10 mb-auto h-4" src={LOGO} alt={`${APP_NAME} Logo`} />

      <p>Thank you for signing up to {APP_NAME}</p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        Please verify your email address by clicking the button below.
      </p>
      <CallToAction
        label="Verify email"
        href={`${WEBAPP_URL}/auth/verify-email?verificationToken=${props.verificationToken}&email=${props.email}`}
      />
    </V2BaseEmailHtml>
  );
};
