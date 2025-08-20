import { Suspense, type ComponentType, useEffect, useState } from "react";

import { SkeletonText } from "@calcom/ui/components/skeleton";

import type { ComponentMapType } from "./types";

function AsyncDynamicComponentInner({
  componentMapPromise,
  slug,
  wrapperClassName,
  ...rest
}: AsyncDynamicComponentProps) {
  const [componentMap, setComponentMap] = useState<ComponentMapType | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    componentMapPromise
      .then((map) => {
        setComponentMap(map);
      })
      .catch((err) => {
        setError(err);
      });
  }, [componentMapPromise]);

  if (error) {
    console.error("Failed to load component map:", error);
    return null;
  }

  if (!componentMap) {
    return <SkeletonText className="h-6 w-24" />;
  }

  const dirName = slug === "stripe" ? "stripepayment" : slug;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component = componentMap[dirName] as ComponentType<any>;

  if (!Component) {
    return null;
  }

  const componentElement = <Component {...rest} />;

  if (wrapperClassName) {
    return <div className={wrapperClassName}>{componentElement}</div>;
  }

  return componentElement;
}

type AsyncDynamicComponentProps = {
  componentMapPromise: Promise<ComponentMapType>;
  slug: string;
  wrapperClassName?: string;
  [key: string]: unknown;
};

export default function AsyncDynamicComponent(props: AsyncDynamicComponentProps) {
  return (
    <Suspense fallback={<SkeletonText className="h-6 w-24" />}>
      <AsyncDynamicComponentInner {...props} />
    </Suspense>
  );
}
