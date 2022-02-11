import classNames from "@lib/classNames";

export type SwatchProps = {
  size?: "base" | "sm" | "lg";
  backgroundColor: string;
  onClick: () => void;
};

const Swatch = (props: SwatchProps) => {
  const { size, backgroundColor, onClick } = props;
  return (
    <div className="border-2 border-gray-200 p-1 shadow-sm">
      <div
        onClick={onClick}
        style={{ backgroundColor }}
        className={classNames(
          "cursor-pointer",
          size === "sm" && "h-6 w-6 rounded-sm",
          size === "base" && "h-16 w-16 rounded-sm",
          size === "lg" && "h-24 w-24 rounded-sm"
        )}></div>
    </div>
  );
};

export default Swatch;
