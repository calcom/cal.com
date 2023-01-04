import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast, Switch } from "@calcom/ui";

const DisableTeamImpersonation = ({
  teamId,
  memberId,
  disabled,
}: {
  teamId: number;
  memberId: number;
  disabled: boolean;
}) => {
  const { t } = useLocale();

  const utils = trpc.useContext();

  const query = trpc.viewer.teams.getMembershipbyUser.useQuery({ teamId, memberId });

  const mutation = trpc.viewer.teams.updateMembership.useMutation({
    onSuccess: async () => {
      showToast(t("your_user_profile_updated_successfully"), "success");
      await utils.viewer.teams.getMembershipbyUser.invalidate();
    },
    async onSettled() {
      await utils.viewer.public.i18n.invalidate();
    },
  });
  if (query.isLoading) return <></>;

  return (
    <>
      <div className="flex flex-col justify-between sm:flex-row">
        <div>
          <div className="flex flex-row items-center">
            <h2
              className={classNames(
                "font-cal mb-0.5 text-sm font-semibold leading-6",
                disabled ? "text-gray-400 " : "text-gray-900 "
              )}>
              {t("user_impersonation_heading")}
            </h2>
          </div>
          <p className={classNames("text-sm leading-5 ", disabled ? "text-gray-300" : "text-gray-600")}>
            {t("team_impersonation_description")}
          </p>
        </div>
        <div className="mt-5 sm:mt-0 sm:self-center">
          <Switch
            disabled={disabled}
            defaultChecked={!query.data?.disableImpersonation}
            onCheckedChange={(isChecked) => {
              mutation.mutate({ teamId, memberId, disableImpersonation: !isChecked });
            }}
          />
        </div>
      </div>
    </>
  );
};

export default DisableTeamImpersonation;
