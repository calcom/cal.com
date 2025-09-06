import { useEffect, useState } from "react";

import { AppComponentFactory } from "../_factories/AppComponentFactory";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DynamicComponent<T extends Record<string, React.ComponentType<any>>>(props: {
  componentMap?: T;
  slug: string;
  wrapperClassName?: string;
}) {
  const { componentMap, slug, wrapperClassName, ...rest } = props;

  if (componentMap) {
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

  return <DynamicComponentWithFactory slug={slug} wrapperClassName={wrapperClassName} {...rest} />;
}

function DynamicComponentWithFactory(props: {
  slug: string;
  wrapperClassName?: string;
  [key: string]: unknown;
}) {
  const { slug, wrapperClassName, ...rest } = props;
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    AppComponentFactory.getComponent(slug)
      .then((comp) => {
        if (isMounted) {
          setComponent(() => comp);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className={wrapperClassName || ""}>
        <div className="animate-pulse">Loading {slug} app...</div>
      </div>
    );
  }

  if (error || !Component) {
    return (
      <div className={wrapperClassName || ""}>
        <div className="text-red-500">Failed to load {slug} app component</div>
      </div>
    );
  }

  return (
    <div className={wrapperClassName || ""}>
      <Component {...rest} />
    </div>
  );
}
