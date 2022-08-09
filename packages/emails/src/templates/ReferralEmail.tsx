import type { TFunction } from "next-i18next";

import { WEBAPP_URL, WEBSITE_URL } from "@calcom/lib/constants";
import type { Referrer } from "@calcom/types/Referral";

import { BaseEmailHtml, CallToAction } from "../components";

export const ReferralEmail = (props: Referrer & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => {
  const { name, username, referralPin } = props;
  const logoGif = WEBAPP_URL + "/cal.com-animated-logo-transparent.gif";

  return (
    <BaseEmailHtml subject="Refer to cal.com">
      <div style={{ textAlign: "center", paddingBottom: 16 }}>
        <img src={logoGif} style={{ width: "auto", height: "20rem" }} alt="Cal.com logo" />
        <p style={{ fontSize: 24, paddingTop: 2, paddingBottom: 4 }}>
          <>{name ? `${name} has referred you to Cal.com` : "You have been referred to Cal.com"} </>
        </p>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <>
            {name || "Your friend"} has been recently using Cal.com for all of their scheduling needs.{" "}
            <a href={username ? `${WEBAPP_URL}/${username}` : WEBSITE_URL}>
              If you’ve scheduled with {name} lately,
            </a>{" "}
            you’ve seen the platform's simplicity and effectiveness; {name} wanted to send you a chance to
            experience the same.
          </>
        </p>
        <CallToAction
          label="Click here to sign up"
          href={`${WEBSITE_URL}/signup/?referralCode=${username}${referralPin}`}
        />
        <p>
          Referral code:{" "}
          <span>
            {username}
            {referralPin}
          </span>
        </p>
      </div>
    </BaseEmailHtml>
  );
};
