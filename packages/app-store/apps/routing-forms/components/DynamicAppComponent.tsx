import type { Route, AttributeRoutingConfig } from "../types/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DynamicAppComponent<T extends Record<string, React.ComponentType<any>>>(props: {
  componentMap: T;
  slug: string;
  appData: any;
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
