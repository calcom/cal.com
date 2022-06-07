export function DynamicComponent<T extends Record<string, any>>(props: { componentMap: T; slug: string }) {
  const { componentMap, slug, ...rest } = props;

  if (!componentMap[slug]) return null;

  const Component = componentMap[slug];

  return <Component {...rest} />;
}
