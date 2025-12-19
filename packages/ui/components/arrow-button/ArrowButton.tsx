import { Icon } from "../icon";

export type ArrowButtonProps = {
  arrowDirection: "up" | "down";
  onClick: () => void;
};

export function ArrowButton(props: ArrowButtonProps) {
  return (
    <>
      {props.arrowDirection === "up" ? (
        <button
          className="bg-default text-muted hover:text-emphasis border-default hover:border-emphasis invisible absolute left-0 -ml-4 -mt-4 mb-4 hidden h-6 w-6 scale-0 items-center justify-center rounded-md border p-1 transition-all group-hover:visible group-hover:scale-100 sm:ml-0 sm:flex lg:left-3"
          onClick={props.onClick}>
          <Icon name="arrow-up" className="h-5 w-5" />
        </button>
      ) : (
        <button
          className="bg-default text-muted border-default hover:text-emphasis hover:border-emphasis invisible absolute left-0 -ml-4 mt-8 hidden h-6 w-6  scale-0 items-center justify-center rounded-md border p-1 transition-all  group-hover:visible group-hover:scale-100 sm:ml-0 sm:flex lg:left-3"
          onClick={props.onClick}>
          <Icon name="arrow-down" className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
