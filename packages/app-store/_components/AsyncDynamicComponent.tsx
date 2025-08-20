import { Suspense, use, type ComponentType } from "react";

import { SkeletonText } from "@calcom/ui/components/skeleton";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentMap = Record<string, ComponentType<any>>;

interface AsyncDynamicComponentProps {
  componentMapPromise: Promise<ComponentMap>;
  slug: string;
  wrapperClassName?: string;
  [key: string]: unknown;
}

function AsyncDynamicComponentInner({
  componentMapPromise,
  slug,
  wrapperClassName,
  ...rest
}: AsyncDynamicComponentProps) {
  const componentMap = use(componentMapPromise);
  const dirName = slug === "stripe" ? "stripepayment" : slug;

  // There can be apps with no matching component
  if (!componentMap[dirName]) return null;

  const Component = componentMap[dirName];

  return (
    <div className={wrapperClassName || ""}>
      <Component {...rest} />
    </div>
  );
}

export function AsyncDynamicComponent(props: AsyncDynamicComponentProps) {
  return (
    <Suspense
      fallback={
        <div className={props.wrapperClassName || ""}>
          <SkeletonText className="h-24 w-full" />
        </div>
      }>
      <AsyncDynamicComponentInner {...props} />
    </Suspense>
  );
}
