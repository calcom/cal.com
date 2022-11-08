import { ExclamationIcon, XCircleIcon } from "@heroicons/react/solid";
import classNames from "classnames";
import { Icon } from "react-feather";

export type TopBannerProps = {
  color?: keyof typeof variantClassName;
  StartIcon?: Icon | React.ElementType;
  actions?: ReactNode;
};

const variantClassName = {
  default: "bg-gradient-primary",
  warning: "bg-orange-400",
  error: "bg-red-400",
};

export function TopBanner(props: TopBannerProps) {
  const { color = "default" } = props;
  return (
    <div
      id="banner"
      className={classNames(
        "absolute z-50 flex h-[40px] w-full items-start justify-between gap-8 border border-b border-gray-200 bg-gray-50 px-4 text-center sm:items-center",
        variantClassName[color]
      )}>
      <div className="flex">
        <p className="w-full text-sm font-light text-gray-500">
          {color === variantClassName["error"] && (
            <XCircleIcon className={classNames("h-5 w-5 text-black")} aria-hidden="true" />
          )}
          {color === variantClassName["warning"] && (
            <ExclamationIcon className={classNames("h-5 w-5 text-black")} aria-hidden="true" />
          )}
          Supercharge your hiring by taking advantage of our
          <a
            className="text-primary-600 dark:text-primary-500 font-medium underline hover:no-underline"
            href="#">
            limited-time sale
          </a>
        </p>
        {props.actions && <div className="text-sm">{props.actions}</div>}
      </div>
      <button
        data-collapse-toggle="banner"
        type="button"
        className="hover:bg-gray-20 flex items-center rounded-lg p-1.5 text-sm text-gray-400">
        <svg
          className="h-5 w-5 text-black"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
