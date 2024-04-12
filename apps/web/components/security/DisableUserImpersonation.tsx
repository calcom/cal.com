import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge, Button, showToast } from "@calcom/ui";

const DisableUserImpersonation = ({ disableImpersonation }: { disableImpersonation: boolean }) => {
  const utils = trpc.useUtils();

  const { t } = useLocale();

  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async () => {
      showToast(t("your_user_profile_updated_successfully"), "success");
      await utils.viewer.me.invalidate();
    },
  });

  return (
    <>
      <div className="flex flex-col justify-between pl-2 pt-9 sm:flex-row">
        <div>
          <div className="flex flex-row items-center">
            <h2 className="font-cal text-emphasis text-lg font-medium leading-6">
              {t("user_impersonation_heading")}
            </h2>
            <Badge className="ml-2 text-xs" variant={!disableImpersonation ? "success" : "gray"}>
              {!disableImpersonation ? t("enabled") : t("disabled")}
            </Badge>
          </div>
          <p className="text-subtle mt-1 text-sm">{t("user_impersonation_description")}</p>
        </div>
        <div className="mt-5 sm:mt-0 sm:self-center">
          <Button
            type="submit"
            color="secondary"
            onClick={() =>
              !disableImpersonation
                ? mutation.mutate({ disableImpersonation: true })
                : mutation.mutate({ disableImpersonation: false })
            }>
            {!disableImpersonation ? t("disable") : t("enable")}
          </Button>
        </div>
      </div>
    </>
  );
};

export default DisableUserImpersonation;
