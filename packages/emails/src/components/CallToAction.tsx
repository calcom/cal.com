import { LinkIcon } from "./LinkIcon";

export const CallToAction = (props: { label: string; href: string }) => (
  <p
    style={{
      display: "inline-block",
      background: "#292929",
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
    }}>
    <a
      style={{ color: "#FFFFFF", textDecoration: "none" }}
      href={props.href}
      target="_blank"
      rel="noreferrer">
      {props.label} <LinkIcon />
    </a>
  </p>
);
