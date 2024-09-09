/// <reference types="react" />
import type z from "zod";
import type { MembershipRole } from "@calcom/prisma/enums";
import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";
/**
 * Organization branding
 *
 * Entries consist of the different properties that constitues a brand for an organization.
 */
export type OrganizationBranding = ({
    /** 1 */
    id: number;
    /** Acme */
    name?: string;
    /** acme */
    slug: string;
    /** logo url */
    logoUrl?: string | null;
    /** https://acme.cal.com */
    fullDomain: string;
    /** cal.com */
    domainSuffix: string;
    role: MembershipRole;
} & z.infer<typeof teamMetadataSchema>) | null | undefined;
/**
 * Accesses the branding for an organization from context.
 * You need to render a <OrgBrandingProvider /> further up to be able to use
 * this component.
 *
 * @returns `undefined` when data isn't available yet, `null` when there's an error, and the data(which can be `null`) when it's available
 */
export declare function useOrgBranding(): OrganizationBranding;
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
export declare function OrgBrandingProvider<F extends {
    orgBrand: OrganizationBranding;
}>(props: {
    value: F;
    children: React.ReactNode;
}): import("react").FunctionComponentElement<import("react").ProviderProps<{
    orgBrand: OrganizationBranding;
} | null>>;
//# sourceMappingURL=provider.d.ts.map