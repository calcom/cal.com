export function DynamicComponent<T extends Record<string, any>>(props: {
  componentMap: T;
  slug: string;
  wrapperClassName?: string;
}) {
  const { componentMap, slug, ...rest } = props;
  const dirName = slug === "stripe" ? "stripepayment" : slug;

  // There can be apps with no matching component
  if (!componentMap[slug]) return null;

  const Component = componentMap[dirName];

  return (
    <div className={props.wrapperClassName || ""}>
      <Component {...rest} />
    </div>
  );
}
