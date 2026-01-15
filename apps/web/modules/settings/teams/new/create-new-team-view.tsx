"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { z } from "zod";

import { HOSTED_CAL_FEATURES } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import type { RouterOutputs } from "@calcom/trpc/react";
import { WizardLayout } from "@calcom/ui/components/layout";
import { CreateANewTeamForm } from "@calcom/web/modules/ee/teams/components/CreateANewTeamForm";

const querySchema = z.object({
  returnTo: z.string().optional(),
  slug: z.string().optional(),
});

const CreateNewTeamPage = () => {
  const params = useParamsWithFallback();
  const parsedQuery = querySchema.safeParse(params);
  const router = useRouter();

  const isTeamBillingEnabledClient = !!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY && HOSTED_CAL_FEATURES;
  const flag = isTeamBillingEnabledClient
    ? {
        submitLabel: "checkout",
      }
    : {
        submitLabel: "continue",
      };

  const returnToParam =
    (parsedQuery.success ? getSafeRedirectUrl(parsedQuery.data.returnTo) : "/teams") || "/teams";

  const onSuccess = (data: RouterOutputs["viewer"]["teams"]["create"]) => {
    // telemetry.event(flag.telemetryEvent);
    router.push(data.url);
  };

  return (
    <CreateANewTeamForm
      slug={parsedQuery.success ? parsedQuery.data.slug : ""}
      onCancel={() => router.push(returnToParam)}
      submitLabel={flag.submitLabel}
      onSuccess={onSuccess}
    />
  );
};
export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <WizardLayout currentStep={1} maxSteps={3}>
      {children}
    </WizardLayout>
  );
};

export default CreateNewTeamPage;
