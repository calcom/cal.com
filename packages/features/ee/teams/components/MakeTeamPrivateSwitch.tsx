import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast, Switch } from "@calcom/ui";

const MakeTeamPrivateSwitch = ({
  teamId,
  isPrivate,
  disabled,
}: {
  teamId: number;
  isPrivate: boolean;
  disabled: boolean;
}) => {
  const { t } = useLocale();

  const utils = trpc.useContext();

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      showToast(t("your_team_updated_successfully"), "success");
    },
  });

  return (
    <>
      <div className="flex flex-col justify-between sm:flex-row">
        <div>
          <div className="flex flex-row items-center">
            <h2
              className={classNames(
                "font-cal mb-0.5 text-sm font-semibold leading-6",
                disabled ? "text-muted " : "text-emphasis "
              )}>
              {t("make_team_private")}
            </h2>
          </div>
          <p className={classNames("text-sm leading-5 ", disabled ? "text-gray-300" : "text-default")}>
            {t("make_team_private_description")}
          </p>
        </div>
        <div className="mt-5 sm:mt-0 sm:self-center">
          <Switch
            disabled={disabled}
            defaultChecked={isPrivate}
            onCheckedChange={(isChecked) => {
              mutation.mutate({ id: teamId, isPrivate: isChecked });
            }}
          />
        </div>
      </div>
    </>
  );
};

export default MakeTeamPrivateSwitch;
