import clsx from "clsx";

const TextHighlight = ({ children, className }) => {
  return (
    <span
      className={clsx("rounded-lg border-b-2 border-yellow-200 bg-yellow-100 px-1 text-gray-900", className)}>
      {children}
    </span>
  );
};

export default TextHighlight;
