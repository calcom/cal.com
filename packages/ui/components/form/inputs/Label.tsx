import { classNames } from "@calcom/lib";

export function Label(props: JSX.IntrinsicElements["label"]) {
  return (
    <label
      {...props}
      className={classNames(
        "mb-2 block text-sm font-medium leading-none text-gray-700 dark:text-white",
        props.className
      )}>
      {props.children}
    </label>
  );
}
