import classNames from "@calcom/ui/classNames";

export function Label(props: JSX.IntrinsicElements["label"]) {
  const { className, ...restProps } = props;
  return (
    <label
      className={classNames(
        "text-default text-emphasis mb-2 block text-sm font-medium leading-none",
        className
      )}
      {...restProps}>
      {props.children}
    </label>
  );
}
