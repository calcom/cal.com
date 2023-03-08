import { LinkIcon } from "./LinkIcon";

export const CallToAction = (props: {
  label: string;
  href: string;
  secondary?: boolean;
  startIconName?: string;
  endIconName?: string;
}) => {
  const { label, href, secondary, startIconName, endIconName } = props;
  return (
    <p
      style={{
        display: "inline-block",
        background: secondary ? "#FFFFFF" : "#292929",
        border: secondary ? "1px solid #d1d5db" : "",
        color: "#ffffff",
        fontFamily: "Roboto, Helvetica, sans-serif",
        fontSize: "0.875rem",
        fontWeight: 500,
        lineHeight: "1.25rem",
        margin: 0,
        textDecoration: "none",
        textTransform: "none",
        padding: "0.625rem 1rem",
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        msoPaddingAlt: "0px",
        borderRadius: "6px",
        boxSizing: "border-box",
        height: "2.25rem",
      }}>
      <a
        style={{
          color: secondary ? "#292929" : "#FFFFFF",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "auto",
        }}
        href={href}
        target="_blank"
        rel="noreferrer">
        {startIconName && (
          <LinkIcon
            style={{
              marginRight: "0.5rem",
              marginLeft: 0,
            }}
            iconName={startIconName}
            secondary={secondary}
          />
        )}
        {label}
        {endIconName && <LinkIcon iconName={endIconName} secondary={secondary} />}
        {!startIconName && !endIconName && <LinkIcon iconName="linkIcon" secondary={secondary} />}
      </a>
    </p>
  );
};
