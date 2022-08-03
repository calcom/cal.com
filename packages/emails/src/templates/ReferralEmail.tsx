import type { TFunction } from "next-i18next";

import { BaseEmailHtml, CallToAction } from "../components";

// type TeamInvite = {
//   language: TFunction;
//   from: string;
//   to: string;
//   teamName: string;
//   joinLink: string;
// };

export const ReferralEmail = (props: Partial<React.ComponentProps<typeof BaseEmailHtml>>) => {
  return (
    <BaseEmailHtml subject="Refer to cal.com">
      <p>
        <>Referred to Cal.com</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <>This is a referral email</>
      </p>
      <CallToAction label="Sign up here" href="http://localhost:3000" />

      <div style={{ lineHeight: "6px" }}>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <>Signup now</>
        </p>
      </div>
    </BaseEmailHtml>
  );
};
