import { CustomI18nProvider } from "app/CustomI18nProvider";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { loadTranslations } from "@calcom/lib/server/i18n";
import slugify from "@calcom/lib/slugify";
import { RedirectType } from "@calcom/prisma/enums";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";
import { getCachedTeamEvent } from "@lib/team/[slug]/[type]/getStaticData";

const paramsSchema = z.object({
  slug: z.string().transform((s) => slugify(s)),
  type: z.string().transform((s) => slugify(s)),
});

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string; type: string }>;
}

export default async function TeamEventTypeLayout({ children, params }: LayoutProps) {
  const { headers, cookies } = await import("next/headers");

  // Build legacy context for org resolution
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, {});

  const result = paramsSchema.safeParse({
    slug: legacyCtx.params?.slug,
    type: legacyCtx.params?.type,
  });

  if (!result.success) {
    return notFound();
  }

  const { slug: teamSlug, type: meetingSlug } = result.data;
  const orgSlug = legacyCtx.params?.orgSlug ?? null;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(legacyCtx.req, orgSlug ?? undefined);
  const isOrgContext = currentOrgDomain && isValidOrgDomain;

  // Handle temporary org redirects for non-org contexts
  if (!isOrgContext) {
    const redirectResult = await getTemporaryOrgRedirect({
      slugs: teamSlug,
      redirectType: RedirectType.Team,
      eventTypeSlug: meetingSlug,
      currentQuery: legacyCtx.query,
    });
    if (redirectResult) redirect(redirectResult.redirect.destination);
  }

  // Get cached team event data for i18n
  const teamEventData = await getCachedTeamEvent({
    teamSlug,
    meetingSlug,
    orgSlug: currentOrgDomain,
  });

  if (!teamEventData) {
    return notFound();
  }

  // Wrap with i18n if needed
  const eventLocale = teamEventData.eventData?.interfaceLanguage;
  if (eventLocale) {
    const ns = "common";
    const translations = await loadTranslations(eventLocale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={eventLocale} ns={ns}>
        {children}
      </CustomI18nProvider>
    );
  }

  return children;
}

// Helper function for pages to get cached org context
export async function getCachedOrgContext(params: any) {
  const { headers, cookies } = await import("next/headers");
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), params, {});
  const result = paramsSchema.safeParse({
    slug: legacyCtx.params?.slug,
    type: legacyCtx.params?.type,
  });

  if (!result.success) {
    throw new Error("Invalid team slug or event type");
  }

  const { slug: teamSlug, type: meetingSlug } = result.data;
  const orgSlug = legacyCtx.params?.orgSlug ?? null;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(legacyCtx.req, orgSlug ?? undefined);

  return {
    currentOrgDomain,
    isValidOrgDomain,
    teamSlug,
    meetingSlug,
  };
}
