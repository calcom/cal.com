import { createContext, useContext, createElement, useMemo } from "react";
import type z from "zod";

import type { MembershipRole } from "@calcom/prisma/enums";
import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { getOrgFullOrigin } from "../lib/orgDomains";

/**
 * Minimal organization data from session (stored in JWT)
 */
type MinimalOrg =
  | ({
      /** 1 */
      id: number;
      /** acme */
      slug: string;
      role: MembershipRole;
    } & z.infer<typeof teamMetadataSchema>)
  | null
  | undefined;

/**
 * Organization branding with computed fields
 *
 * Entries consist of the different properties that constitute a brand for an organization.
 * The fullDomain field is computed from the slug at runtime to keep JWT tokens small.
 */
export type OrganizationBranding =
  | ({
      /** 1 */
      id: number;
      /** acme */
      slug: string;
      /** https://acme.cal.com */
      fullDomain: string;
      role: MembershipRole;
    } & z.infer<typeof teamMetadataSchema>)
  | null
  | undefined;

/**
 * Allows you to access the flags from context
 */
const OrganizationBrandingContext = createContext<{ orgBrand: OrganizationBranding } | null>(null);

/**
 * Accesses the branding for an organization from context.
 * You need to render a <OrgBrandingProvider /> further up to be able to use
 * this component.
 *
 * @returns `undefined` when data isn't available yet, `null` when there's an error, and the data(which can be `null`) when it's available
 */
export function useOrgBranding() {
  const orgBrandingContext = useContext(OrganizationBrandingContext);
  if (!orgBrandingContext) throw new Error("Error: useOrgBranding was used outside of OrgBrandingProvider.");
  return orgBrandingContext.orgBrand;
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
export function OrgBrandingProvider<F extends { orgBrand: MinimalOrg }>(props: {
  value: F;
  children: React.ReactNode;
}) {
  const enrichedOrgBrand = useMemo<OrganizationBranding>(() => {
    if (!props.value.orgBrand) {
      return props.value.orgBrand;
    }
    return {
      ...props.value.orgBrand,
      fullDomain: getOrgFullOrigin(props.value.orgBrand.slug),
    };
  }, [props.value.orgBrand]);

  return createElement(
    OrganizationBrandingContext.Provider,
    { value: { orgBrand: enrichedOrgBrand } },
    props.children
  );
}
