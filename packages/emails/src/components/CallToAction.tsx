import { LinkIcon } from "./LinkIcon";

export const CallToAction = (props: { label: string; href: string; secondary?: boolean }) => (
  <p
    style={{
      display: "inline-block",
      background: props.secondary ? "#FFFFFF" : "#292929",
      border: props.secondary ? "1px solid #292929" : "",
      color: "#ffffff",
      fontFamily: "Roboto, Helvetica, sans-serif",
      fontSize: "16px",
      fontWeight: 500,
      lineHeight: "120%",
      margin: 0,
      textDecoration: "none",
      textTransform: "none",
      padding: "10px 25px",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      msoPaddingAlt: "0px",
      borderRadius: "3px",
      boxSizing: "border-box",
    }}>
    <a
      style={{ color: props.secondary ? "#292929" : "#FFFFFF", textDecoration: "none" }}
      href={props.href}
      target="_blank"
      rel="noreferrer">
      {props.label} <LinkIcon />
    </a>
  </p>
);
