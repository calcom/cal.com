import { ProgressBar } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc/react";
import { Button, TextField, Label } from "@calcom/ui";

export default function BillingCredits() {
  const { t } = useLocale();

  const params = useParamsWithFallback();
  //if this is given we are on the teams billing page
  const teamId = params.id ? Number(params.id) : undefined;

  const { data: creditsData } = trpc.viewer.getAllCredits.useQuery({ teamId: teamId });

  if (!creditsData || (!creditsData.teamCredits && !creditsData.userCredits)) {
    return <></>;
  }

  const teamCreditsPercentageUsed = creditsData.teamCredits
    ? (creditsData.teamCredits.totalRemainingMonthlyCredits / creditsData.teamCredits.totalMonthlyCredits) *
      100
    : 0;

  return (
    <div className="pb-6mt-6 border-subtle mt-8 space-y-6 rounded-lg border px-6 py-6 text-sm sm:space-y-8">
      <div>
        <h2 className="text-base font-semibold">{t("credits")}</h2>
        <p>{t("view_and_manage_credits_description")}</p>
        <div className="-mx-6 mt-6">
          <hr className="border-subtle" />
        </div>
        <div className="mt-6">
          {creditsData.teamCredits ? (
            <>
              <div className="mb-4">
                <Label>Monthly credits</Label>
                <ProgressBar
                  color="green"
                  percentageValue={teamCreditsPercentageUsed}
                  label={`${teamCreditsPercentageUsed}%`}
                />
                <div className="text-subtle">
                  <div>Total credits: {creditsData.teamCredits.totalMonthlyCredits} </div>
                  <div>Remaining credits: {creditsData.teamCredits.totalRemainingMonthlyCredits}</div>
                </div>
              </div>
              <Label>Additional credits</Label>
              <div className="mt-2 text-sm">{creditsData.teamCredits.additionalCredits}</div>{" "}
            </>
          ) : (
            <></>
          )}
          {creditsData.userCredits && !teamId ? (
            <>
              <Label>Additional credits {creditsData.teamCredits ? "(your user credits)" : ""}</Label>
              <div className="mt-2 text-sm">{creditsData.userCredits.additionalCredits}</div>{" "}
            </>
          ) : (
            <></>
          )}

          <div className="-mx-6 mb-6 mt-6">
            <hr className="border-subtle mb-3 mt-3" />
          </div>
          <div className="flex">
            <div className="mr-auto">
              <div className="mb-2 font-semibold">{t("buy_additional_credits")}</div>
              <div className="flex flex-col">
                <TextField
                  required
                  type="number"
                  containerClassName="w-60"
                  //labelClassName="w-44"
                  //  className="w-36" // Ensures limited width
                  label={t("buy_credits")}
                  defaultValue={0}
                  addOnSuffix={<>{t("credits")}</>}
                  min={1}
                />
              </div>
            </div>

            {/* disable button if 0 credits*/}
            <div className="mt-4">
              <Button color="primary" target="_blank" EndIcon="external-link">
                {t("buy_credits")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
