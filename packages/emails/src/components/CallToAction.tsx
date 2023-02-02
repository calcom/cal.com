import { LinkIcon } from "./LinkIcon";

export const CallToAction = (props: { label: string; href: string; secondary?: boolean }) => (
  <p
    style={{
      display: "inline-block",
      background: props.secondary ? "#FFFFFF" : "#292929",
      border: props.secondary ? "1px solid #d1d5db" : "",
      color: "#ffffff",
      fontFamily: "Roboto, Helvetica, sans-serif",
      fontSize: "14px",
      fontWeight: 500,
      lineHeight: "20px",
      margin: 0,
      textDecoration: "none",
      textTransform: "none",
      padding: "16px 24px",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      msoPaddingAlt: "0px",
      borderRadius: "6px",
      boxSizing: "border-box",
    }}>
    <a
      style={{ color: props.secondary ? "#292929" : "#FFFFFF", textDecoration: "none" }}
      href={props.href}
      target="_blank"
      rel="noreferrer">
      {props.label}
      <LinkIcon secondary={props.secondary} />
    </a>
  </p>
);
