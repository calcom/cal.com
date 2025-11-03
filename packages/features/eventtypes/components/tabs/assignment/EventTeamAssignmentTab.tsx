import type { TFunction } from "i18next";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { Options } from "react-select";
import { v4 as uuidv4 } from "uuid";

import type { AddMembersWithSwitchCustomClassNames } from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import AddMembersWithSwitch, {
  mapUserToValue,
} from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import AssignAllTeamMembers from "@calcom/features/eventtypes/components/AssignAllTeamMembers";
import type { ChildrenEventTypeSelectCustomClassNames } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import ChildrenEventTypeSelect from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import { sortHosts } from "@calcom/features/eventtypes/components/HostEditDialogs";
import { LearnMoreLink } from "@calcom/features/eventtypes/components/LearnMoreLink";
import type {
  FormValues,
  TeamMember,
  EventTypeSetupProps,
  Host,
  SelectClassNames,
  SettingsToggleClassNames,
} from "@calcom/features/eventtypes/lib/types";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RRTimestampBasis, SchedulingType } from "@calcom/prisma/enums";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Label } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { RadioAreaGroup as RadioArea } from "@calcom/ui/components/radio";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { EditWeightsForAllTeamMembers } from "../../EditWeightsForAllTeamMembers";
import WeightDescription from "../../WeightDescription";

export type EventTeamAssignmentTabCustomClassNames = {
  assignmentType?: {
    container?: string;
    label?: string;
    description?: string;
    schedulingTypeSelect?: SelectClassNames;
  };
  hosts?: HostsCustomClassNames;
  childrenEventTypes?: ChildrenEventTypesCustomClassNames;
};

export type EventTeamAssignmentTabBaseProps = Pick<
  EventTypeSetupProps,
  "teamMembers" | "team" | "eventType"
> & {
  customClassNames?: EventTeamAssignmentTabCustomClassNames;
  orgId: number | null;
  isSegmentApplicable: boolean;
};

export const mapMemberToChildrenOption = (
  member: EventTypeSetupProps["teamMembers"][number],
  slug: string,
  pendingString: string
) => {
  return {
    slug,
    hidden: false,
    created: false,
    owner: {
      id: member.id,
      name: member.name ?? "",
      email: member.email,
      username: member.username ?? "",
      membership: member.membership,
      eventTypeSlugs: member.eventTypes ?? [],
      avatar: member.avatar,
      profile: member.profile,
    },
    value: `${member.id ?? ""}`,
    label: `${member.name || member.email || ""}${!member.username ? ` (${pendingString})` : ""}`,
  };
};

const ChildrenEventTypesList = ({
  options = [],
  value,
  onChange,
  customClassNames,
  ...rest
}: {
  value: ReturnType<typeof mapMemberToChildrenOption>[];
  onChange?: (options: ReturnType<typeof mapMemberToChildrenOption>[]) => void;
  options?: Options<ReturnType<typeof mapMemberToChildrenOption>>;
  customClassNames?: ChildrenEventTypeSelectCustomClassNames;
} & Omit<Partial<ComponentProps<typeof ChildrenEventTypeSelect>>, "onChange" | "value">) => {
  const { t } = useLocale();
  return (
    <div className={classNames("flex flex-col space-y-5", customClassNames?.assignToSelect?.container)}>
      <div>
        <Label className={customClassNames?.assignToSelect?.label}>{t("assign_to")}</Label>
        <ChildrenEventTypeSelect
          aria-label="assignment-dropdown"
          data-testid="assignment-dropdown"
          onChange={(options) => {
            onChange &&
              onChange(
                options.map((option) => ({
                  ...option,
                }))
              );
          }}
          value={value}
          options={options.filter((opt) => !value.find((val) => val.owner.id.toString() === opt.value))}
          controlShouldRenderValue={false}
          customClassNames={customClassNames}
          {...rest}
        />
      </div>
    </div>
  );
};

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

type FixedHostsCustomClassNames = SettingsToggleClassNames & {
  addMembers?: AddMembersWithSwitchCustomClassNames;
};
const FixedHosts = ({
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
                "text-subtle max-w-full break-words text-sm leading-tight",
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

type RoundRobinHostsCustomClassNames = {
  container?: string;
  label?: string;
  description?: string;
  enableWeights?: SettingsToggleClassNames;
  addMembers?: AddMembersWithSwitchCustomClassNames;
};

const RoundRobinHosts = ({
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
                "text-subtle max-w-full break-words text-sm leading-tight",
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
                  assignAllTeamMembers={assignAllTeamMembers}
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
                      <Icon name="x" className="h-4 w-4" />
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

type ChildrenEventTypesCustomClassNames = {
  container?: string;
  assignAllTeamMembers?: SettingsToggleClassNames;
  childrenEventTypesList?: ChildrenEventTypeSelectCustomClassNames;
};

const ChildrenEventTypes = ({
  childrenEventTypeOptions,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  customClassNames,
}: {
  childrenEventTypeOptions: ReturnType<typeof mapMemberToChildrenOption>[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  customClassNames?: ChildrenEventTypesCustomClassNames;
}) => {
  const { setValue } = useFormContext<FormValues>();
  return (
    <div
      className={classNames(
        "border-subtle mt-6 space-y-5 rounded-lg border px-4 py-6 sm:px-6",
        customClassNames?.container
      )}>
      <div className="flex flex-col gap-4">
        <AssignAllTeamMembers
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          customClassNames={customClassNames?.assignAllTeamMembers}
          onActive={() => setValue("children", childrenEventTypeOptions, { shouldDirty: true })}
        />
        {!assignAllTeamMembers ? (
          <Controller<FormValues>
            name="children"
            render={({ field: { onChange, value } }) => (
              <ChildrenEventTypesList
                value={value}
                options={childrenEventTypeOptions}
                onChange={onChange}
                customClassNames={customClassNames?.childrenEventTypesList}
              />
            )}
          />
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

type HostsCustomClassNames = {
  fixedHosts?: FixedHostsCustomClassNames;
  roundRobinHosts?: RoundRobinHostsCustomClassNames;
};
const Hosts = ({
  orgId,
  teamId,
  teamMembers,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  customClassNames,
  isSegmentApplicable,
}: {
  orgId: number | null;
  teamId: number;
  teamMembers: TeamMember[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  customClassNames?: HostsCustomClassNames;
  isSegmentApplicable: boolean;
}) => {
  const {
    control,
    setValue,
    getValues,
    formState: { submitCount },
  } = useFormContext<FormValues>();
  const schedulingType = useWatch({
    control,
    name: "schedulingType",
  });
  const initialValue = useRef<{
    hosts: FormValues["hosts"];
    schedulingType: SchedulingType | null;
    submitCount: number;
  } | null>(null);

  useEffect(() => {
    // Handles init & out of date initial value after submission.
    if (!initialValue.current || initialValue.current?.submitCount !== submitCount) {
      initialValue.current = { hosts: getValues("hosts"), schedulingType, submitCount };
      return;
    }
    setValue(
      "hosts",
      initialValue.current.schedulingType === schedulingType ? initialValue.current.hosts : [],
      { shouldDirty: true }
    );
  }, [schedulingType, setValue, getValues, submitCount]);

  // To ensure existing host do not loose its scheduleId and groupId properties, whenever a new host of same type is added.
  // This is because the host is created from list option in CheckedHostField component.
  const updatedHosts = (changedHosts: Host[]) => {
    const existingHosts = getValues("hosts");
    return changedHosts.map((newValue) => {
      const existingHost = existingHosts.find((host: Host) => host.userId === newValue.userId);

      return existingHost
        ? {
            ...newValue,
            scheduleId: existingHost.scheduleId,
            groupId: existingHost.groupId,
          }
        : newValue;
    });
  };

  return (
    <Controller<FormValues>
      name="hosts"
      render={({ field: { onChange, value } }) => {
        const schedulingTypeRender = {
          COLLECTIVE: (
            <FixedHosts
              teamId={teamId}
              teamMembers={teamMembers}
              value={value}
              onChange={(changeValue) => {
                onChange([...updatedHosts(changeValue)]);
              }}
              assignAllTeamMembers={assignAllTeamMembers}
              setAssignAllTeamMembers={setAssignAllTeamMembers}
              customClassNames={customClassNames?.fixedHosts}
            />
          ),
          ROUND_ROBIN: (
            <>
              <FixedHosts
                teamId={teamId}
                teamMembers={teamMembers}
                value={value}
                onChange={(changeValue) => {
                  onChange([...value.filter((host: Host) => !host.isFixed), ...updatedHosts(changeValue)]);
                }}
                assignAllTeamMembers={assignAllTeamMembers}
                setAssignAllTeamMembers={setAssignAllTeamMembers}
                isRoundRobinEvent={true}
                customClassNames={customClassNames?.fixedHosts}
              />
              <RoundRobinHosts
                orgId={orgId}
                teamId={teamId}
                teamMembers={teamMembers}
                value={value}
                onChange={(changeValue) => {
                  const hosts = [...value.filter((host: Host) => host.isFixed), ...updatedHosts(changeValue)];
                  onChange(hosts);
                }}
                assignAllTeamMembers={assignAllTeamMembers}
                setAssignAllTeamMembers={setAssignAllTeamMembers}
                customClassNames={customClassNames?.roundRobinHosts}
                isSegmentApplicable={isSegmentApplicable}
              />
            </>
          ),
          MANAGED: <></>,
        };
        return !!schedulingType ? schedulingTypeRender[schedulingType] : <></>;
      }}
    />
  );
};

export const EventTeamAssignmentTab = ({
  team,
  teamMembers,
  eventType,
  customClassNames,
  orgId,
  isSegmentApplicable,
}: EventTeamAssignmentTabBaseProps) => {
  const { t } = useLocale();

  const schedulingTypeOptions: {
    value: SchedulingType;
    label: string;
    // description: string;
  }[] = [
    {
      value: "COLLECTIVE",
      label: t("collective"),
      // description: t("collective_description"),
    },
    {
      value: "ROUND_ROBIN",
      label: t("round_robin"),
      // description: t("round_robin_description"),
    },
  ];
  const pendingMembers = (member: (typeof teamMembers)[number]) =>
    !!eventType.team?.parentId || !!member.username;
  const teamMembersOptions = teamMembers
    .filter(pendingMembers)
    .map((member) => mapUserToValue(member, t("pending")));
  const childrenEventTypeOptions = teamMembers.filter(pendingMembers).map((member) => {
    return mapMemberToChildrenOption(
      {
        ...member,
        eventTypes: member.eventTypes.filter(
          (et) => et !== eventType.slug || !eventType.children.some((c) => c.owner.id === member.id)
        ),
      },
      eventType.slug,
      t("pending")
    );
  });
  const isManagedEventType = eventType.schedulingType === SchedulingType.MANAGED;
  const { getValues, setValue, control } = useFormContext<FormValues>();
  const [assignAllTeamMembers, setAssignAllTeamMembers] = useState<boolean>(
    getValues("assignAllTeamMembers") ?? false
  );

  const resetRROptions = () => {
    setValue("assignRRMembersUsingSegment", false, { shouldDirty: true });
    setValue("assignAllTeamMembers", false, { shouldDirty: true });
    setAssignAllTeamMembers(false);
  };

  const handleSchedulingTypeChange = useCallback(
    (schedulingType: SchedulingType | undefined, onChange: (value: SchedulingType | undefined) => void) => {
      if (schedulingType) {
        onChange(schedulingType);
        resetRROptions();
      }
    },
    [setValue, setAssignAllTeamMembers]
  );

  const handleMaxLeadThresholdChange = (val: string, onChange: (value: number | null) => void) => {
    if (val === "loadBalancing") {
      onChange(3);
    } else {
      onChange(null);
    }
  };

  const schedulingType = useWatch({
    control,
    name: "schedulingType",
  });

  const hostGroups = useWatch({
    control,
    name: "hostGroups",
  });

  return (
    <div>
      {team && !isManagedEventType && (
        <>
          <div
            className={classNames(
              "border-subtle flex flex-col rounded-md",
              customClassNames?.assignmentType?.container
            )}>
            <div className="border-subtle rounded-t-md border p-6 pb-5">
              <Label
                className={classNames("mb-1 text-sm font-semibold", customClassNames?.assignmentType?.label)}>
                {t("assignment")}
              </Label>
              <p
                className={classNames(
                  "text-subtle max-w-full break-words text-sm leading-tight",
                  customClassNames?.assignmentType?.description
                )}>
                {t("assignment_description")}
              </p>
            </div>
            <div
              className={classNames(
                "border-subtle rounded-b-md border border-t-0 p-6",
                customClassNames?.assignmentType?.schedulingTypeSelect?.container
              )}>
              <Label className={customClassNames?.assignmentType?.schedulingTypeSelect?.label}>
                {t("scheduling_type")}
              </Label>
              <Controller<FormValues>
                name="schedulingType"
                render={({ field: { value, onChange } }) => (
                  <Select
                    options={schedulingTypeOptions}
                    value={schedulingTypeOptions.find((opt) => opt.value === value)}
                    className={classNames(
                      "w-full",
                      customClassNames?.assignmentType?.schedulingTypeSelect?.select
                    )}
                    innerClassNames={customClassNames?.assignmentType?.schedulingTypeSelect?.innerClassNames}
                    onChange={(val) => handleSchedulingTypeChange(val?.value, onChange)}
                  />
                )}
              />
            </div>
          </div>
          {schedulingType === "ROUND_ROBIN" && (
            <div className="border-subtle mt-4 flex flex-col rounded-md">
              <div className="border-subtle rounded-t-md border p-6 pb-5">
                <Label className="mb-1 text-sm font-semibold">{t("rr_distribution_method")}</Label>
                <p className="text-subtle max-w-full break-words text-sm leading-tight">
                  {t("rr_distribution_method_description")}
                </p>
              </div>
              <div className="border-subtle rounded-b-md border border-t-0 p-6">
                <Controller
                  name="maxLeadThreshold"
                  render={({ field: { value, onChange } }) => (
                    <RadioArea.Group
                      onValueChange={(val) => handleMaxLeadThresholdChange(val, onChange)}
                      className="mt-1 flex flex-col gap-4">
                      <RadioArea.Item
                        value="maximizeAvailability"
                        checked={value === null}
                        className="w-full text-sm"
                        classNames={{ container: "w-full" }}>
                        <strong className="mb-1 block">
                          {t("rr_distribution_method_availability_title")}
                        </strong>
                        <p>{t("rr_distribution_method_availability_description")}</p>
                      </RadioArea.Item>
                      {(eventType.team?.rrTimestampBasis &&
                        eventType.team?.rrTimestampBasis !== RRTimestampBasis.CREATED_AT) ||
                      hostGroups?.length > 1 ? (
                        <Tooltip
                          content={
                            !!(
                              eventType.team?.rrTimestampBasis &&
                              eventType.team?.rrTimestampBasis !== RRTimestampBasis.CREATED_AT
                            )
                              ? t("rr_load_balancing_disabled")
                              : t("rr_load_balancing_disabled_with_groups")
                          }>
                          <div className="w-full">
                            <RadioArea.Item
                              value="loadBalancing"
                              checked={value !== null}
                              className="text-sm"
                              disabled={true}
                              classNames={{ container: "w-full" }}>
                              <strong className="mb-1">{t("rr_distribution_method_balanced_title")}</strong>
                              <p>{t("rr_distribution_method_balanced_description")}</p>
                            </RadioArea.Item>
                          </div>
                        </Tooltip>
                      ) : (
                        <div className="w-full">
                          <RadioArea.Item
                            value="loadBalancing"
                            checked={value !== null}
                            className="text-sm"
                            classNames={{ container: "w-full" }}>
                            <strong className="mb-1">{t("rr_distribution_method_balanced_title")}</strong>
                            <p>{t("rr_distribution_method_balanced_description")}</p>
                          </RadioArea.Item>
                        </div>
                      )}
                    </RadioArea.Group>
                  )}
                />
                <div className="mt-4">
                  <Controller
                    name="includeNoShowInRRCalculation"
                    render={({ field: { value, onChange } }) => (
                      <SettingsToggle
                        title={t("include_no_show_in_rr_calculation")}
                        labelClassName="mt-1.5"
                        checked={value}
                        onCheckedChange={(val) => onChange(val)}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          )}
          <Hosts
            orgId={orgId}
            isSegmentApplicable={isSegmentApplicable}
            teamId={team.id}
            assignAllTeamMembers={assignAllTeamMembers}
            setAssignAllTeamMembers={setAssignAllTeamMembers}
            teamMembers={teamMembersOptions}
            customClassNames={customClassNames?.hosts}
          />
        </>
      )}
      {team && isManagedEventType && (
        <ChildrenEventTypes
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          childrenEventTypeOptions={childrenEventTypeOptions}
          customClassNames={customClassNames?.childrenEventTypes}
        />
      )}
    </div>
  );
};
