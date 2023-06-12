import { createContext, useContext, createElement } from "react";
import type z from "zod";

import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";

/**
 * Organization branding
 *
 * Entries consist of the different properties that constitues a brand for an organization.
 */
export type OrganizationBranding =
  | ({
      logo?: string | null | undefined;
      name?: string;
      slug?: string;
    } & z.infer<typeof teamMetadataSchema>)
  | null
  | undefined;

/**
 * Allows you to access the flags from context
 */
const OrganizationBrandingContext = createContext<OrganizationBranding | null>(null);

/**
 * Accesses the branding for an organization from context.
 *
 * You need to render a <OrgBrandingProvider /> further up to be able to use
 * this component.
 */
export function useOrgBranding() {
  const orgBrandingContext = useContext(OrganizationBrandingContext);
  if (orgBrandingContext === null)
    throw new Error("Error: useOrganizationBranding was used outside of OrgBrandingProvider.");
  return orgBrandingContext as OrganizationBranding;
}

/**
 * If you want to be able to access the flags from context using `useOrganizationBranding()`,
 * you can render the OrgBrandingProvider at the top of your Next.js pages, like so:
 *
 * ```ts
 * import { useOrgBrandingValues } from "@calcom/features/flags/hooks/useFlag"
 * import { OrgBrandingProvider, useOrgBranding } from @calcom/features/flags/context/provider"
 *
 * export default function YourPage () {
 *   const orgBrand = useOrgBrandingValues()
 *
 *   return (
 *     <OrgBrandingProvider value={orgBrand}>
 *       <YourOwnComponent />
 *     </OrgBrandingProvider>
 *   )
 * }
 * ```
 *
 * You can then call `useOrgBrandingValues()` to access your `OrgBranding` from within
 * `YourOwnComponent` or further down.
 *
 */
export function OrgBrandingProvider<F extends OrganizationBranding>(props: {
  value: F;
  children: React.ReactNode;
}) {
  return createElement(OrganizationBrandingContext.Provider, { value: props.value }, props.children);
}
