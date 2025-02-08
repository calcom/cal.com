vi.mock("../Section", () => {
  const BookerSection = ({
    children,
    className = "",
    area,
  }: {
    children: React.ReactNode;
    className?: string;
    area?: string | { default: string; month_view: string };
  }) => {
    console.log("BookerSection", { type: children.type, children, className, area });
    return (
      <div
        data-testid="booker-section"
        className={className}
        data-area={typeof area === "string" ? area : area?.default}>
        {children}
      </div>
    );
  };
  return { BookerSection };
});
