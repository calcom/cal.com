import AssignAllTeamMembers from "@calcom/features/eventtypes/components/AssignAllTeamMembers";
import { LearnMoreLink } from "@calcom/features/eventtypes/components/LearnMoreLink";
import WeightDescription from "@calcom/features/eventtypes/components/WeightDescription";
import type {
  FormValues,
  Host,
  SettingsToggleClassNames,
  TeamMember,
} from "@calcom/features/eventtypes/lib/types";
import { sortHosts } from "@calcom/lib/bookings/hostGroupUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Label, SettingsToggle } from "@calcom/ui/components/form";
import type { AddMembersWithSwitchCustomClassNames } from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";
import AddMembersWithSwitch from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";
import { EditWeightsForAllTeamMembers } from "@calcom/web/modules/event-types/components/EditWeightsForAllTeamMembers";
import { XIcon } from "@coss/ui/icons";
import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

export type RoundRobinHostsCustomClassNames = {
  container?: string;
  label?: string;
  description?: string;
  enableWeights?: SettingsToggleClassNames;
  addMembers?: AddMembersWithSwitchCustomClassNames;
};

export const RoundRobinHosts = ({
  orgId,
  teamMembers,
  value,
  onChange,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  customClassNames,
  teamId,
  isSegmentApplicable,
}: {
  orgId: number | null;
  value: Host[];
  onChange: (hosts: Host[]) => void;
  teamMembers: TeamMember[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  customClassNames?: RoundRobinHostsCustomClassNames;
  teamId: number;
  isSegmentApplicable: boolean;
}) => {
  const { t } = useLocale();

  const { setValue, getValues, control, formState } = useFormContext<FormValues>();
  const assignRRMembersUsingSegment = getValues("assignRRMembersUsingSegment");
  const isRRWeightsEnabled = useWatch({
    control,
    name: "isRRWeightsEnabled",
  });
  const rrSegmentQueryValue = useWatch({
    control,
    name: "rrSegmentQueryValue",
  });
  const hostGroups = useWatch({
    control,
    name: "hostGroups",
  });

  const handleWeightsEnabledChange = (active: boolean, onChange: (value: boolean) => void) => {
    onChange(active);
    const allHosts = getValues("hosts");
    const fixedHosts = allHosts.filter((host) => host.isFixed);
    const rrHosts = allHosts.filter((host) => !host.isFixed);
    const sortedRRHosts = rrHosts.sort((a, b) => sortHosts(a, b, active));
    // Preserve fixed hosts when updating
    setValue("hosts", [...fixedHosts, ...sortedRRHosts]);
  };

  const handleWeightsChange = (hosts: Host[]) => {
    const allHosts = getValues("hosts");
    const fixedHosts = allHosts.filter((host) => host.isFixed);
    const sortedRRHosts = hosts.sort((a, b) => sortHosts(a, b, true));
    // Preserve fixed hosts when updating
    setValue("hosts", [...fixedHosts, ...sortedRRHosts], { shouldDirty: true });
  };

  const handleAddGroup = useCallback(() => {
    const allHosts = getValues("hosts");
    const currentRRHosts = allHosts.filter((host) => !host.isFixed);
    const fixedHosts = allHosts.filter((host) => host.isFixed);

    // If there are already hosts added and no group exists yet, create two groups
    if (hostGroups?.length === 0 && currentRRHosts.length > 0) {
      const firstGroup = { id: uuidv4(), name: "" };
      const secondGroup = { id: uuidv4(), name: "" };
      const updatedHostGroups = [firstGroup, secondGroup];
      setValue("hostGroups", updatedHostGroups, { shouldDirty: true });

      const updatedRRHosts = currentRRHosts.map((host) => {
        if (!host.groupId && !host.isFixed) {
          return { ...host, groupId: firstGroup.id };
        }
        return host;
      });
      setValue("hosts", [...fixedHosts, ...updatedRRHosts], { shouldDirty: true });
    } else {
      // If groups already exist, just add one more group
      const newGroup = { id: uuidv4(), name: "" };
      const updatedHostGroups = [...hostGroups, newGroup];
      setValue("hostGroups", updatedHostGroups, { shouldDirty: true });
    }

    // Disable 'Add all team members' switch if enabled
    if (assignAllTeamMembers) {
      setValue("assignAllTeamMembers", false, { shouldDirty: true });
      setAssignAllTeamMembers(false);
    }
  }, [hostGroups, getValues, setValue, assignAllTeamMembers, setAssignAllTeamMembers]);

  const handleGroupNameChange = useCallback(
    (groupId: string, newName: string) => {
      const updatedHostGroups =
        hostGroups?.map((g) => (g.id === groupId ? { ...g, name: newName } : g)) || [];
      setValue("hostGroups", updatedHostGroups, { shouldDirty: true });
    },
    [hostGroups, setValue]
  );

  const handleRemoveGroup = useCallback(
    (groupId: string) => {
      // Remove the group from hostGroups
      const updatedHostGroups = hostGroups?.filter((g) => g.id !== groupId) || [];
      setValue("hostGroups", updatedHostGroups, { shouldDirty: true });

      // Remove all hosts that belong to this group
      const updatedHosts = value.filter((host) => host.groupId !== groupId);
      onChange(updatedHosts);
      setValue("hosts", updatedHosts, { shouldDirty: true });
    },
    [hostGroups, setValue, value, onChange]
  );

  const handleMembersActivation = useCallback(
    (groupId: string | null) => {
      const currentHosts = getValues("hosts");
      setValue(
        "hosts",
        teamMembers.map((teamMember) => {
          const host = currentHosts.find((host) => host.userId === parseInt(teamMember.value, 10));
          return {
            isFixed: false,
            userId: parseInt(teamMember.value, 10),
            priority: host?.priority ?? 2,
            weight: host?.weight ?? 100,
            // if host was already added, retain scheduleId and groupId
            scheduleId: host?.scheduleId || teamMember.defaultScheduleId,
            groupId: host?.groupId || groupId,
          };
        }),
        { shouldDirty: true }
      );
    },
    [getValues, setValue, teamMembers]
  );

  const AddMembersWithSwitchComponent = ({
    groupId,
    containerClassName,
  }: {
    groupId: string | null;
    containerClassName?: string;
  }) => {
    return (
      <AddMembersWithSwitch
        placeholder={t("add_a_member")}
        teamId={teamId}
        teamMembers={teamMembers}
        value={value}
        onChange={onChange}
        assignAllTeamMembers={assignAllTeamMembers}
        setAssignAllTeamMembers={setAssignAllTeamMembers}
        isSegmentApplicable={isSegmentApplicable}
        automaticAddAllEnabled={true}
        isRRWeightsEnabled={isRRWeightsEnabled}
        isFixed={false}
        groupId={groupId}
        containerClassName={containerClassName || (assignAllTeamMembers ? "-mt-4" : "")}
        onActive={() => handleMembersActivation(groupId)}
        customClassNames={customClassNames?.addMembers}
      />
    );
  };

  const UnassignedHostsGroup = () => {
    const unassignedHosts = value.filter((host) => !host.isFixed && !host.groupId);

    if (unassignedHosts.length === 0) {
      return null;
    }

    return (
      <div className="border-subtle my-4 rounded-md border p-4 pb-0">
        <div className="-mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-default text-sm font-medium">{`Group ${hostGroups.length + 1}`}</span>
          </div>
        </div>
        <AddMembersWithSwitchComponent groupId={null} />
      </div>
    );
  };

  return (
    <div className={classNames("rounded-lg")}>
      <div
        className={classNames(
          "border-subtle mt-5 rounded-t-md border p-6 pb-5",
          customClassNames?.container
        )}>
        <div className="flex items-center justify-between">
          <div>
            <Label className={classNames("mb-1 text-sm font-semibold", customClassNames?.label)}>
              {t("round_robin_hosts")}
            </Label>
            <p
              className={classNames(
                "text-subtle wrap-break-word max-w-full text-sm leading-tight",
                customClassNames?.description
              )}>
              <LearnMoreLink
                t={t}
                i18nKey={hostGroups?.length > 0 ? "round_robin_groups_helper" : "round_robin_helper"}
                href="https://cal.com/help/event-types/round-robin"
              />
            </p>
          </div>
          <Button color="secondary" size="sm" StartIcon="plus" onClick={handleAddGroup}>
            {t("add_group")}
          </Button>
        </div>
      </div>
      <div className="border-subtle rounded-b-md border border-t-0 px-6 pt-4">
        <>
          <Controller<FormValues>
            name="isRRWeightsEnabled"
            render={({ field: { value: isRRWeightsEnabled, onChange } }) => (
              <SettingsToggle
                title={t("enable_weights")}
                description={<WeightDescription t={t} />}
                checked={isRRWeightsEnabled}
                switchContainerClassName={customClassNames?.enableWeights?.container}
                labelClassName={customClassNames?.enableWeights?.label}
                descriptionClassName={customClassNames?.enableWeights?.description}
                onCheckedChange={(active) => handleWeightsEnabledChange(active, onChange)}>
                <EditWeightsForAllTeamMembers
                  teamMembers={teamMembers}
                  value={value}
                  onChange={handleWeightsChange}
                  assignRRMembersUsingSegment={assignRRMembersUsingSegment}
                  teamId={teamId}
                  queryValue={rrSegmentQueryValue}
                />
              </SettingsToggle>
            )}
          />
        </>
        {!hostGroups.length ? (
          <AddMembersWithSwitchComponent groupId={hostGroups[0]?.id ?? null} />
        ) : (
          <>
            {/* Show unassigned hosts first */}
            <UnassignedHostsGroup />

            {/* Show all defined groups */}
            {hostGroups.map((group, index) => {
              const groupNumber = index + 1;

              return (
                <div key={index} className="border-subtle my-4 rounded-md border p-4 pb-0">
                  <div className="-mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={group.name ?? ""}
                        onChange={(e) => handleGroupNameChange(group.id, e.target.value)}
                        className="border-none bg-transparent p-0 text-sm font-medium focus:outline-none focus:ring-0"
                        placeholder={`Group ${groupNumber}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveGroup(group.id)}
                      className="text-subtle hover:text-default rounded p-1">
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <AddMembersWithSwitchComponent groupId={group.id} />
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};
