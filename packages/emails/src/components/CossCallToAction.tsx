const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const CossCallToAction = ({
  label,
  href,
  variant = "default",
}: {
  label: string;
  href: string;
  variant?: "default" | "destructive";
}) => {
  const bgColor = variant === "destructive" ? "#ef4444" : "#27272a";

  return (
    <table role="presentation" cellPadding="0" cellSpacing="0">
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: bgColor,
              borderRadius: "10px",
              boxShadow: `0 1px 2px rgba(0, 0, 0, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.12)`,
              textAlign: "center",
            }}>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                padding: "10px 20px",
                fontFamily: FONT_STACK,
                fontSize: "14px",
                fontWeight: 600,
                color: "#ffffff",
                textDecoration: "none",
                lineHeight: "1",
              }}>
              {label}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
};
