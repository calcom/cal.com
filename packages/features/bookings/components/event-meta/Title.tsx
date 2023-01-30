interface EventTitleProps {
  children: React.ReactNode;
  /**
   * Option to override the default h1 tag.
   */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
}

export const EventTitle = ({ children, as }: EventTitleProps) => {
  const El = as || "h1";
  return <El className="text-brand-900 text-xl font-semibold dark:text-white">{children}</El>;
};
