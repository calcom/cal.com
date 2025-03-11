import Script from "next/script";

export function SpeculationRules({
  prefetchPathsOnHover = [],
  prerenderPathsOnHover = [],
}: {
  prefetchPathsOnHover?: string[];
  prerenderPathsOnHover?: string[];
}) {
  const speculationRules = {
    prefetch: [
      {
        urls: prefetchPathsOnHover,
        eagerness: "moderate",
      },
    ],
    prerender: [
      {
        urls: prerenderPathsOnHover,
        eagerness: "moderate",
      },
    ],
  };

  return (
    <Script
      dangerouslySetInnerHTML={{
        __html: `${JSON.stringify(speculationRules)}`,
      }}
      type="speculationrules"
      id="speculation-rules"
    />
  );
}
