import { classNames } from "@calcom/lib";

export function Label(props: JSX.IntrinsicElements["label"]) {
  return (
    <label
      {...props}
      className={classNames(
        "text-default dark:text-inverted mb-2 block text-sm font-medium leading-none",
        props.className
      )}>
      {props.children}
    </label>
  );
}
