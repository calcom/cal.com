import { TFunction } from "next-i18next";

import { BaseEmailHtml, LinkIcon } from "../components";

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
      <p
        style={{
          display: "inline-block",
          background: "#292929",
          color: "#292929",
          fontFamily: "Roboto, Helvetica, sans-serif",
          fontSize: "13px",
          fontWeight: "normal",
          lineHeight: "120%",
          margin: "24px 0",
          textDecoration: "none",
          textTransform: "none",
          padding: "10px 25px",
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          msoPaddingAlt: "0px",
          borderRadius: "3px",
        }}>
        <a
          href={props.joinLink}
          target="_blank"
          style={{ color: "#FFFFFF", textDecoration: "none" }}
          rel="noreferrer">
          <>
            {props.language("accept_invitation")} <LinkIcon />
          </>
        </a>
      </p>

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
