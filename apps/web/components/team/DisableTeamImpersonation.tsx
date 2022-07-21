import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import Button from "@calcom/ui/Button";

import { trpc } from "@lib/trpc";

import Badge from "@components/ui/Badge";

const DisableTeamImpersonation = ({ teamId, memberId }: { teamId: number; memberId: number }) => {
  const { t } = useLocale();

  const utils = trpc.useContext();

  const query = trpc.useQuery(["viewer.teams.getMembershipbyUser", { teamId, memberId }]);

  const mutation = trpc.useMutation("viewer.teams.updateMembership", {
    onSuccess: async () => {
      showToast(t("your_user_profile_updated_successfully"), "success");
      await utils.invalidateQueries(["viewer.teams.getMembershipbyUser"]);
    },
    async onSettled() {
      await utils.invalidateQueries(["viewer.public.i18n"]);
    },
  });
  if (query.isLoading) return <></>;

  return (
    <>
      <h3 className="font-cal mt-7 pb-4 text-xl leading-6 text-gray-900">{t("settings")}</h3>
      <div className="-mx-0 rounded-sm border border-neutral-200 bg-white px-4 pb-4 sm:px-6">
        <div className="flex flex-col justify-between pt-4 sm:flex-row">
          <div>
            <div className="flex flex-row items-center">
              <h2 className="font-cal font-bold leading-6 text-gray-900">
                {t("user_impersonation_heading")}
              </h2>
              <Badge
                className="ml-2 text-xs"
                variant={!query.data?.disableImpersonation ? "success" : "gray"}>
                {!query.data?.disableImpersonation ? t("enabled") : t("disabled")}
              </Badge>
            </div>
            <p className="text-sm text-gray-700">{t("team_impersonation_description")}</p>
          </div>
          <div className="mt-5 sm:mt-0 sm:self-center">
            <Button
              type="submit"
              color="secondary"
              onClick={() =>
                !query.data?.disableImpersonation
                  ? mutation.mutate({ teamId, memberId, disableImpersonation: true })
                  : mutation.mutate({ teamId, memberId, disableImpersonation: false })
              }>
              {!query.data?.disableImpersonation ? t("disable") : t("enable")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DisableTeamImpersonation;
