import type { TFunction } from "next-i18next";

import { BaseEmailHtml, CallToAction } from "../components";

type TeamInvite = {
  language: TFunction;
  from: string;
  to: string;
  teamName: string;
  joinLink: string;
};

export const TeamInviteEmail = (props: TeamInvite & Partial<React.ComponentProps<typeof BaseEmailHtml>>) => {
  return (
    <BaseEmailHtml
      subject={props.language("user_invited_you", {
        user: props.from,
        team: props.teamName,
      })}>
      <p>
        <>{props.language("user_invited_you", { user: props.from, team: props.teamName })}!</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <>{props.language("calcom_explained")}</>
      </p>
      <CallToAction label={props.language("accept_invitation")} href={props.joinLink} />

      <div style={{ lineHeight: "6px" }}>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <>
            {props.language("have_any_questions")}{" "}
            <a href="mailto:support@cal.com" style={{ color: "#3E3E3E" }} target="_blank" rel="noreferrer">
              <>{props.language("contact_our_support_team")}</>
            </a>
          </>
        </p>
      </div>
    </BaseEmailHtml>
  );
};
