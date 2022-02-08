import classNames from "@lib/classNames";

export type SwatchProps = {
  size?: "base" | "sm" | "lg";
  backgroundColor: string;
  onClick: () => void;
};

const Swatch = (props: SwatchProps) => {
  const { size, backgroundColor, onClick } = props;
  return (
    <div className="p-1 border-2 border-gray-200 shadow-sm">
      <div
        onClick={onClick}
        style={{ backgroundColor }}
        className={classNames(
          "cursor-pointer",
          size === "sm" && "w-6 h-6 rounded-sm",
          size === "base" && "w-16 h-16 rounded-sm",
          size === "lg" && "w-24 h-24 rounded-sm"
        )}></div>
    </div>
  );
};

export default Swatch;
