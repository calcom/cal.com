import classNames from "@calcom/lib/classNames";

interface EventTitleProps {
  children: React.ReactNode;
  /**
   * Option to override the default h1 tag.
   */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
  className?: string;
}

export const EventTitle = ({ children, as, className }: EventTitleProps) => {
  const El = as || "h1";
  return (
    <El
      data-testid="event-title"
      style={{ color: "#598392" }}
      className={classNames("text-text -my-2 text-xl font-semibold", className)}>
      {children}
    </El>
  );
};
