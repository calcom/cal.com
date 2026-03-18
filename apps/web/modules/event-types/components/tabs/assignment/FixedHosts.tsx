import type {
  FormValues,
  Host,
  SettingsToggleClassNames,
  TeamMember,
} from "@calcom/features/eventtypes/lib/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Label, SettingsToggle } from "@calcom/ui/components/form";
import type { AddMembersWithSwitchCustomClassNames } from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";
import AddMembersWithSwitch from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";
import type { TFunction } from "i18next";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useState } from "react";
import { useFormContext } from "react-hook-form";

const FixedHostHelper = ({ t }: { t: TFunction }) => (
  <ServerTrans
    t={t}
    i18nKey="fixed_host_helper"
    components={[
      <Link
        key="fixed_host_helper"
        className="underline underline-offset-2"
        target="_blank"
        href="https://cal.com/docs/enterprise-features/teams/round-robin-scheduling#fixed-hosts">
        Learn more
      </Link>,
    ]}
  />
);

export type FixedHostsCustomClassNames = SettingsToggleClassNames & {
  addMembers?: AddMembersWithSwitchCustomClassNames;
};

export const FixedHosts = ({
  teamId,
  teamMembers,
  value,
  onChange,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  isRoundRobinEvent = false,
  customClassNames,
}: {
  teamId: number;
  value: Host[];
  onChange: (hosts: Host[]) => void;
  teamMembers: TeamMember[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  isRoundRobinEvent?: boolean;
  customClassNames?: FixedHostsCustomClassNames;
}) => {
  const { t } = useLocale();
  const { getValues, setValue } = useFormContext<FormValues>();

  const hasActiveFixedHosts = isRoundRobinEvent && getValues("hosts").some((host) => host.isFixed);

  const [isDisabled, setIsDisabled] = useState(hasActiveFixedHosts);

  const handleFixedHostsActivation = useCallback(() => {
    const currentHosts = getValues("hosts");
    setValue(
      "hosts",
      teamMembers.map((teamMember) => {
        const host = currentHosts.find((host) => host.userId === parseInt(teamMember.value, 10));
        return {
          isFixed: true,
          userId: parseInt(teamMember.value, 10),
          priority: host?.priority ?? 2,
          weight: host?.weight ?? 100,
          // if host was already added, retain scheduleId and groupId
          scheduleId: host?.scheduleId || teamMember.defaultScheduleId,
          groupId: host?.groupId || null,
        };
      }),
      { shouldDirty: true }
    );
  }, [getValues, setValue, teamMembers]);

  const handleFixedHostsToggle = useCallback(
    (checked: boolean) => {
      if (!checked) {
        const rrHosts = getValues("hosts")
          .filter((host) => !host.isFixed)
          .sort((a, b) => (b.priority ?? 2) - (a.priority ?? 2));
        setValue("hosts", rrHosts, { shouldDirty: true });
      }
      setIsDisabled(checked);
    },
    [getValues, setValue]
  );

  return (
    <div className={classNames("mt-5 rounded-lg", customClassNames?.container)}>
      {!isRoundRobinEvent ? (
        <>
          <div
            className={classNames(
              "border-subtle mt-5 rounded-t-md border p-6 pb-5",
              customClassNames?.container
            )}>
            <Label className={classNames("mb-1 text-sm font-semibold", customClassNames?.label)}>
              {t("fixed_hosts")}
            </Label>
            <p
              className={classNames(
                "text-subtle wrap-break-word max-w-full text-sm leading-tight",
                customClassNames?.description
              )}>
              <FixedHostHelper t={t} />
            </p>
          </div>
          <div className="border-subtle rounded-b-md border border-t-0 px-6">
            <AddMembersWithSwitch
              teamId={teamId}
              groupId={null}
              teamMembers={teamMembers}
              value={value}
              onChange={onChange}
              assignAllTeamMembers={assignAllTeamMembers}
              setAssignAllTeamMembers={setAssignAllTeamMembers}
              automaticAddAllEnabled={!isRoundRobinEvent}
              isFixed={true}
              customClassNames={customClassNames?.addMembers}
              onActive={handleFixedHostsActivation}
            />
          </div>
        </>
      ) : (
        <SettingsToggle
          data-testid="fixed-hosts-switch"
          toggleSwitchAtTheEnd={true}
          title={t("fixed_hosts")}
          description={<FixedHostHelper t={t} />}
          checked={isDisabled && !assignAllTeamMembers}
          hideSwitch={assignAllTeamMembers}
          labelClassName={classNames("text-sm", customClassNames?.label)}
          descriptionClassName={classNames("text-sm text-subtle", customClassNames?.description)}
          switchContainerClassName={customClassNames?.container}
          onCheckedChange={handleFixedHostsToggle}
          childrenClassName={classNames("lg:ml-0", customClassNames?.children)}>
          <div className="border-subtle flex flex-col gap-6 rounded-bl-md rounded-br-md border border-t-0 px-6">
            <AddMembersWithSwitch
              data-testid="fixed-hosts-select"
              groupId={null}
              placeholder={t("add_a_member")}
              teamId={teamId}
              teamMembers={teamMembers}
              customClassNames={customClassNames?.addMembers}
              value={value}
              onChange={onChange}
              assignAllTeamMembers={assignAllTeamMembers}
              setAssignAllTeamMembers={setAssignAllTeamMembers}
              automaticAddAllEnabled={!isRoundRobinEvent}
              isFixed={true}
              onActive={handleFixedHostsActivation}
            />
          </div>
        </SettingsToggle>
      )}
    </div>
  );
};
