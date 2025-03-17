import { ProgressBar } from "@tremor/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc/react";
import { Button, TextField, Label, InputError } from "@calcom/ui";

export default function BillingCredits() {
  const { t } = useLocale();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<{ quantity: number }>({ defaultValues: { quantity: 50 } });

  const params = useParamsWithFallback();
  //if this is given we are on the teams billing page
  const teamId = params.id ? Number(params.id) : undefined;

  const { data: creditsData } = trpc.viewer.credits.getAllCredits.useQuery({ teamId: teamId });

  const buyCreditsMutation = trpc.viewer.credits.buyCredits.useMutation({
    onSuccess: (data) => {
      if (data.sessionUrl) {
        router.push(data.sessionUrl);
      }
    },
    onError: (err) => {
      showToast(t("Credit purchase failed. Please try again or contact support."), "error");
    },
  });

  if (!creditsData || (!creditsData.teamCredits && !creditsData.userCredits)) {
    return <></>;
  }

  const onSubmit = (data: { quantity: number }) => {
    buyCreditsMutation.mutate({ quantity: data.quantity, teamId });
  };
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
                  label={`${Math.round(teamCreditsPercentageUsed)}%`}
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
          {/* for user credits before being part of the org */}
          {creditsData.userCredits.additionalCredits > 0 && !teamId ? (
            <>
              <Label className="mt-4">
                Additional credits {creditsData.teamCredits ? "(your user credits)" : ""}
              </Label>
              <div className="mt-2 text-sm">{creditsData.userCredits.additionalCredits}</div>{" "}
            </>
          ) : (
            <></>
          )}

          <div className="-mx-6 mb-6 mt-6">
            <hr className="border-subtle mb-3 mt-3" />
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="flex">
            <div className="mr-auto">
              <div className="mb-2 font-semibold">{t("buy_additional_credits")}</div>
              <div className="flex flex-col">
                <TextField
                  required
                  type="number"
                  {...register("quantity", {
                    required: t("This field is required"),
                    min: { value: 50, message: t("Minimum 50 credits") },
                    valueAsNumber: true,
                  })}
                  label=""
                  containerClassName="w-60"
                  onChange={(e) => setValue("quantity", Number(e.target.value))}
                  min={50}
                  addOnSuffix={<>{t("credits")}</>}
                />
                {errors.quantity && <InputError message={errors.quantity.message} />}
                {/* Show error message */}
              </div>
            </div>

            {/* disable button if 0 credits*/}
            <div className="mb-1 mt-auto">
              <Button color="primary" target="_blank" EndIcon="external-link" type="submit">
                {t("buy_credits")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
