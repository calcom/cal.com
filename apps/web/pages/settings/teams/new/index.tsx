"use client";

import Head from "next/head";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { CreateANewTeamForm } from "@calcom/features/ee/teams/components";
import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import type { RouterOutputs } from "@calcom/trpc/react";
import { WizardLayout } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const querySchema = z.object({
  returnTo: z.string().optional(),
  slug: z.string().optional(),
});

const CreateNewTeamPage = () => {
  const { t } = useLocale();
  const params = useParamsWithFallback();
  const parsedQuery = querySchema.safeParse(params);
  const router = useRouter();
  const telemetry = useTelemetry();

  const isTeamBillingEnabledClient = !!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY && HOSTED_CAL_FEATURES;
  const flag = isTeamBillingEnabledClient
    ? {
        telemetryEvent: telemetryEventTypes.team_checkout_session_created,
        submitLabel: "checkout",
      }
    : {
        telemetryEvent: telemetryEventTypes.team_created,
        submitLabel: "continue",
      };

  const returnToParam =
    (parsedQuery.success ? getSafeRedirectUrl(parsedQuery.data.returnTo) : "/teams") || "/teams";

  const onSuccess = (data: RouterOutputs["viewer"]["teams"]["create"]) => {
    telemetry.event(flag.telemetryEvent);
    router.push(data.url);
  };

  return (
    <>
      <Head>
        <title>{t("create_new_team")}</title>
        <meta name="description" content={t("create_new_team_description")} />
      </Head>
      <CreateANewTeamForm
        slug={parsedQuery.success ? parsedQuery.data.slug : ""}
        onCancel={() => router.push(returnToParam)}
        submitLabel={flag.submitLabel}
        onSuccess={onSuccess}
      />
    </>
  );
};
export const LayoutWrapper = (page: React.ReactElement) => {
  return (
    <WizardLayout currentStep={1} maxSteps={2}>
      {page}
    </WizardLayout>
  );
};

CreateNewTeamPage.getLayout = LayoutWrapper;
CreateNewTeamPage.PageWrapper = PageWrapper;

export default CreateNewTeamPage;
