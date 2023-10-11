import { classNames } from "@calcom/lib";

export function Label(props: JSX.IntrinsicElements["label"]) {
  const { className, ...restProps } = props;
  return (
    <label
      className={classNames("text-default text-emphasis mb-2 block text-sm font-medium", className)}
      {...restProps}>
      {props.children}
    </label>
  );
}
