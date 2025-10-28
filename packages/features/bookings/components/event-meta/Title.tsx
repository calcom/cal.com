import classNames from "@calcom/ui/classNames";

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
      className={classNames("text-text break-words text-xl font-semibold", className)}>
      {children}
    </El>
  );
};
