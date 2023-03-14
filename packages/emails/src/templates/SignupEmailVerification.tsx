import { APP_NAME, WEBAPP_URL, LOGO } from "@calcom/lib/constants";

import { V2BaseEmailHtml, CallToAction } from "../components";

export const SignupEmailVerification = (props: { verificationToken: string; email: string }) => {
  return (
    <V2BaseEmailHtml subject="Signup email verification">
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
        }}>
        <img src={LOGO} alt={`${APP_NAME} Logo`} />
      </div>

      <p style={{ textAlign: "center", fontSize: "24px" }}>Thank you for signing up to {APP_NAME}</p>
      <p style={{ fontWeight: 400, lineHeight: "24px", textAlign: "center" }}>
        Please verify your email address by clicking the button below.
      </p>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <CallToAction
          label="Verify email"
          href={`${WEBAPP_URL}/auth/verify-email?verificationToken=${props.verificationToken}&email=${props.email}`}
        />
      </div>
    </V2BaseEmailHtml>
  );
};
