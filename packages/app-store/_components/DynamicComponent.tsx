// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DynamicComponent<T extends Record<string, React.ComponentType<any>>>(props: {
  componentMap: T;
  slug: string;
  wrapperClassName?: string;
}) {
  const { componentMap, slug, wrapperClassName, ...rest } = props;
  const dirName = slug === "stripe" ? "stripepayment" : slug;

  // There can be apps with no matching component
  if (!componentMap[slug]) return null;

  const Component = componentMap[dirName];

  return (
    <div className={wrapperClassName || ""}>
      <Component {...rest} />
    </div>
  );
}
