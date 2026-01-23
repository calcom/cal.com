import { Button } from "@react-email/components";

import { CallToActionIcon } from "./CallToActionIcon";

export const CallToAction = (props: {
  label: string;
  href?: string;
  secondary?: boolean;
  startIconName?: string;
  endIconName?: string;
}) => {
  const { label, href, secondary, startIconName, endIconName } = props;

  const calculatePadding = () => {
    const paddingTop = "0.625rem";
    const paddingBottom = "0.625rem";
    let paddingLeft = "1rem";
    let paddingRight = "1rem";

    if (startIconName) {
      paddingLeft = "0.875rem";
    } else if (endIconName) {
      paddingRight = "0.875rem";
    }

    return `${paddingTop} ${paddingRight} ${paddingBottom} ${paddingLeft}`;
  };

  // If no href, fall back to the old button behavior
  if (!href) {
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
          lineHeight: "1rem",
          margin: 0,
          textDecoration: "none",
          textTransform: "none",
          padding: calculatePadding(),
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          msoPaddingAlt: "0px",
          borderRadius: "6px",
          boxSizing: "border-box",
          height: "2.25rem",
        }}>
        <button
          type="submit"
          style={{
            color: secondary ? "#292929" : "#FFFFFF",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "auto",
            appearance: "none",
            background: "transparent",
            border: "none",
            padding: 0,
            fontSize: "inherit",
            fontWeight: 500,
            lineHeight: "1rem",
            cursor: "pointer",
          }}>
          {startIconName && (
            <CallToActionIcon
              style={{
                marginRight: "0.5rem",
                marginLeft: 0,
              }}
              iconName={startIconName}
            />
          )}
          {label}
          {endIconName && <CallToActionIcon iconName={endIconName} />}
        </button>
      </p>
    );
  }

  // Use react-email Button for links
  return (
    <Button
      href={href}
      style={{
        display: "inline-block",
        background: secondary ? "#FFFFFF" : "#292929",
        border: secondary ? "1px solid #d1d5db" : "none",
        color: secondary ? "#292929" : "#FFFFFF",
        fontFamily: "Roboto, Helvetica, sans-serif",
        fontSize: "0.875rem",
        fontWeight: 500,
        lineHeight: "1rem",
        textDecoration: "none",
        textTransform: "none",
        padding: calculatePadding(),
        borderRadius: "6px",
        boxSizing: "border-box",
      }}>
      {startIconName && (
        <CallToActionIcon
          style={{
            marginRight: "0.5rem",
            marginLeft: 0,
          }}
          iconName={startIconName}
        />
      )}
      {label}
      {endIconName && <CallToActionIcon iconName={endIconName} />}
    </Button>
  );
};
