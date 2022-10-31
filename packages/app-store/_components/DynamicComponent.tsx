export function DynamicComponent<T extends Record<string, any>>(props: {
  componentMap: T;
  slug: string;
  wrapperClassName?: string;
}) {
  const { componentMap, slug, ...rest } = props;
  const dirName = slug === "stripe" ? "stripepayment" : slug;

  if (!componentMap[dirName]) {
    throw new Error('No component found for "' + dirName + '"');
  }

  const Component = componentMap[dirName];

  return (
    <div className={props.wrapperClassName || ""}>
      <Component {...rest} />
    </div>
  );
}
