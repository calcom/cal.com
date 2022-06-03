import { TFunction } from "next-i18next";

import { BaseEmailHtml, LinkIcon } from "../components";

export type PasswordReset = {
  language: TFunction;
  user: {
    name?: string | null;
    email: string;
  };
  resetLink: string;
};
export const ForgotPasswordEmail = (
  props: PasswordReset & Partial<React.ComponentProps<typeof BaseEmailHtml>>
) => {
  return (
    <BaseEmailHtml subject={props.language("reset_password_subject")}>
      <p>
        <>{props.language("hi_user_name", { user: props.user.name })}!</>
      </p>
      <p style={{ fontWeight: 400, lineHeight: "24px" }}>
        <>{props.language("someone_requested_password_reset")}</>
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
          href={props.resetLink}
          target="_blank"
          style={{ color: "#FFFFFF", textDecoration: "none" }}
          rel="noreferrer">
          <>
            {props.language("change_password")} <LinkIcon />
          </>
        </a>
      </p>

      <div style={{ lineHeight: "6px" }}>
        <p style={{ fontWeight: 400, lineHeight: "24px" }}>
          <>{props.language("password_reset_instructions")}</>
        </p>
      </div>
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
