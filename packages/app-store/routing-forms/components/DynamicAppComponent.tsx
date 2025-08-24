import type { Route, AttributeRoutingConfig } from "../types/types";

export default function DynamicAppComponent<T extends Record<string, React.ComponentType<unknown>>>(props: {
  componentMap: T;
  slug: string;
  appData: unknown;
  route: Route;
  setAttributeRoutingConfig: (id: string, attributeRoutingConfig: Partial<AttributeRoutingConfig>) => void;
  wrapperClassName?: string;
}) {
  const { componentMap, slug, wrapperClassName, appData, route, setAttributeRoutingConfig, ...rest } = props;

  // There can be apps with no matching component
  if (!componentMap[slug]) return null;

  const Component = componentMap[slug];

  return (
    <div className={wrapperClassName || ""}>
      <Component
        appData={appData}
        route={route}
        setAttributeRoutingConfig={setAttributeRoutingConfig}
        {...rest}
      />
    </div>
  );
}
