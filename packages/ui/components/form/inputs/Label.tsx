import { classNames } from "@calcom/lib";

export function Label(props: JSX.IntrinsicElements["label"]) {
  return (
    <label
      {...props}
      className={classNames("text-default text-emphasis mb-2 block text-sm font-medium", props.className)}>
      {props.children}
    </label>
  );
}
