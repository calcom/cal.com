export function DynamicComponent<T extends Record<string, any>>(props: {
  componentMap: T;
  slug: string;
  wrapperClassName?: string;
}) {
  const { componentMap, slug, ...rest } = props;

  if (!componentMap[slug]) return null;

  const Component = componentMap[slug];

  return (
    <div className={props.wrapperClassName || ""}>
      <Component {...rest} />
    </div>
  );
}
