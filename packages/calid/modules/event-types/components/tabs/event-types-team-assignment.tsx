"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { Options } from "react-select";

import type { AddMembersWithSwitchCustomClassNames } from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import { mapUserToValue } from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import AssignAllTeamMembers from "@calcom/features/eventtypes/components/AssignAllTeamMembers";
import type { ChildrenEventTypeSelectCustomClassNames } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import ChildrenEventTypeSelect from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import { EditWeightsForAllTeamMembers } from "@calcom/features/eventtypes/components/EditWeightsForAllTeamMembers";
import { sortHosts } from "@calcom/features/eventtypes/components/HostEditDialogs";
import WeightDescription from "@calcom/features/eventtypes/components/WeightDescription";
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
import { RoundRobinTimestampBasis, SchedulingType } from "@calcom/prisma/enums";
import classNames from "@calcom/ui/classNames";
import { Label } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { RadioAreaGroup as RadioArea } from "@calcom/ui/components/radio";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { AddMembersWithSwitchCalIdWrapper as AddMembersWithSwitch } from "../add-members-switch/AddMembersWithSwitchCalIdWrapper";

export type EventTeamAssignmentTabCustomClassNames = {
  wrapper?: string;
  assignmentType?: {
    container?: string;
    label?: string;
    description?: string;
    schedulingTypeSelect?: SelectClassNames;
  };
  distributionMethod?: {
    container?: string;
    label?: string;
    description?: string;
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
    <div className={classNames("space-y-4", customClassNames?.assignToSelect?.container)}>
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

const FixedHostHelper = ({ t }: { t: any }) => (
  <ServerTrans
    t={t}
    i18nKey="fixed_host_helper"
    components={[
      <Link
        key="fixed_host_helper"
        className="underline underline-offset-2"
        target="_blank"
        href="https://cal.id">
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
  calIdTeamId,
  teamMembers,
  value,
  onChange,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  isRoundRobinEvent = false,
  customClassNames,
}: {
  teamId: number;
  calIdTeamId?: number;
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

  return (
    <div className={classNames("space-y-6", customClassNames?.container)}>
      {!isRoundRobinEvent ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className={classNames("text-sm font-semibold", customClassNames?.label)}>
              {t("fixed_hosts")}
            </Label>
            <p className={classNames("text-sm text-gray-600", customClassNames?.description)}>
              <FixedHostHelper t={t} />
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <AddMembersWithSwitch
              teamId={teamId}
              calIdTeamId={calIdTeamId}
              teamMembers={teamMembers}
              value={value}
              onChange={onChange}
              assignAllTeamMembers={assignAllTeamMembers}
              setAssignAllTeamMembers={setAssignAllTeamMembers}
              automaticAddAllEnabled={!isRoundRobinEvent}
              isFixed={true}
              customClassNames={customClassNames?.addMembers}
              onActive={() => {
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
                      scheduleId: host?.scheduleId || teamMember.defaultScheduleId,
                    };
                  }),
                  { shouldDirty: true }
                );
              }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className={classNames("text-sm font-semibold", customClassNames?.label)}>
              {t("fixed_hosts")}
            </Label>
            <p className={classNames("text-sm text-gray-600", customClassNames?.description)}>
              <FixedHostHelper t={t} />
            </p>
          </div>
          <div className="space-y-4">
            <SettingsToggle
              data-testid="fixed-hosts-switch"
              title=""
              checked={isDisabled && !assignAllTeamMembers}
              hideSwitch={assignAllTeamMembers}
              onCheckedChange={(checked) => {
                if (!checked) {
                  const rrHosts = getValues("hosts")
                    .filter((host) => !host.isFixed)
                    .sort((a, b) => (b.priority ?? 2) - (a.priority ?? 2));
                  setValue("hosts", rrHosts, { shouldDirty: true });
                }
                setIsDisabled(checked);
              }}
            />
            {isDisabled && !assignAllTeamMembers && (
              <div className="rounded-lg border border-gray-200 p-4">
                <AddMembersWithSwitch
                  data-testid="fixed-hosts-select"
                  placeholder={t("add_a_member")}
                  teamId={teamId}
                  calIdTeamId={calIdTeamId}
                  teamMembers={teamMembers}
                  customClassNames={customClassNames?.addMembers}
                  value={value}
                  onChange={onChange}
                  assignAllTeamMembers={assignAllTeamMembers}
                  setAssignAllTeamMembers={setAssignAllTeamMembers}
                  automaticAddAllEnabled={!isRoundRobinEvent}
                  isFixed={true}
                  onActive={() => {
                    const currentHosts = getValues("hosts");
                    setValue(
                      "hosts",
                      teamMembers.map((teamMember) => {
                        const host = currentHosts.find(
                          (host) => host.userId === parseInt(teamMember.value, 10)
                        );
                        return {
                          isFixed: true,
                          userId: parseInt(teamMember.value, 10),
                          priority: host?.priority ?? 2,
                          weight: host?.weight ?? 100,
                          scheduleId: host?.scheduleId || teamMember.defaultScheduleId,
                        };
                      }),
                      { shouldDirty: true }
                    );
                  }}
                />
              </div>
            )}
          </div>
        </div>
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
  calIdTeamId,
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
  calIdTeamId?: number;
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

  return (
    <div className={classNames("space-y-6", customClassNames?.container)}>
      <div className="space-y-2">
        <Label className={classNames("text-sm font-semibold", customClassNames?.label)}>
          {t("round_robin_hosts")}
        </Label>
        <p className={classNames("text-sm text-gray-600", customClassNames?.description)}>
          {t("round_robin_helper")}
        </p>
      </div>
      <div className="space-y-4 rounded-lg border border-gray-200 p-4">
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
              onCheckedChange={(active) => {
                onChange(active);
                const rrHosts = getValues("hosts").filter((host) => !host.isFixed);
                const sortedRRHosts = rrHosts.sort((a, b) => sortHosts(a, b, active));
                setValue("hosts", sortedRRHosts);
              }}
            />
          )}
        />
        {isRRWeightsEnabled && (
          <EditWeightsForAllTeamMembers
            teamMembers={teamMembers}
            value={value}
            onChange={(hosts) => {
              const sortedRRHosts = hosts.sort((a, b) => sortHosts(a, b, true));
              setValue("hosts", sortedRRHosts, { shouldDirty: true });
            }}
            assignAllTeamMembers={assignAllTeamMembers}
            assignRRMembersUsingSegment={assignRRMembersUsingSegment}
            teamId={teamId}
            queryValue={rrSegmentQueryValue}
          />
        )}
        <AddMembersWithSwitch
          placeholder={t("add_a_member")}
          teamId={teamId}
          calIdTeamId={calIdTeamId}
          teamMembers={teamMembers}
          value={value}
          onChange={onChange}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          isSegmentApplicable={isSegmentApplicable}
          automaticAddAllEnabled={true}
          isRRWeightsEnabled={isRRWeightsEnabled}
          isFixed={false}
          containerClassName={assignAllTeamMembers ? "-mt-4" : ""}
          onActive={() => {
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
                  scheduleId: host?.scheduleId || teamMember.defaultScheduleId,
                };
              }),
              { shouldDirty: true }
            );
          }}
          customClassNames={customClassNames?.addMembers}
        />
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
    <div className={classNames("space-y-4", customClassNames?.container)}>
      <AssignAllTeamMembers
        assignAllTeamMembers={assignAllTeamMembers}
        setAssignAllTeamMembers={setAssignAllTeamMembers}
        customClassNames={customClassNames?.assignAllTeamMembers}
        onActive={() => setValue("children", childrenEventTypeOptions, { shouldDirty: true })}
      />
      {!assignAllTeamMembers && (
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
      )}
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
  calIdTeamId,
  teamMembers,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  customClassNames,
  isSegmentApplicable,
}: {
  orgId: number | null;
  teamId: number;
  calIdTeamId?: number;
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

  const updatedHosts = (changedHosts: Host[]) => {
    const existingHosts = getValues("hosts");
    return changedHosts.map((newValue) => {
      const existingHost = existingHosts.find((host: Host) => host.userId === newValue.userId);
      return existingHost
        ? {
            ...newValue,
            scheduleId: existingHost.scheduleId,
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
              calIdTeamId={calIdTeamId}
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
            <div className="space-y-6">
              <FixedHosts
                teamId={teamId}
                calIdTeamId={calIdTeamId}
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
                calIdTeamId={calIdTeamId}
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
            </div>
          ),
        };
        return schedulingType ? schedulingTypeRender[schedulingType] : <></>;
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
  }[] = [
    {
      value: "COLLECTIVE",
      label: t("collective"),
    },
    {
      value: "ROUND_ROBIN",
      label: t("round_robin"),
    },
  ];

  const pendingMembers = (member: (typeof teamMembers)[number]) => {
    // Handle both flat and nested user data structures
    const hasUsername = member.username || (member as any).user?.username;
    return !!eventType.team?.parentId || !!hasUsername;
  };

  const teamMembersOptions = teamMembers.filter(pendingMembers).map((member) => {
    // Handle both flat and nested user data structures
    const userData = (member as any).user ? (member as any).user : member;
    return mapUserToValue(userData, t("pending"));
  });

  const childrenEventTypeOptions = teamMembers.filter(pendingMembers).map((member) => {
    // Handle both flat and nested user data structures
    const userData = (member as any).user ? (member as any).user : member;
    return mapMemberToChildrenOption(
      {
        ...userData,
        eventTypes: (member as any).eventTypes || [],
        id: userData.id,
        name: userData.name,
        email: userData.email,
        username: userData.username,
        avatar: userData.avatarUrl || userData.avatar,
        membership: (member as any).role || "MEMBER",
        profile: userData.profile || null,
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

  const schedulingType = useWatch({
    control,
    name: "schedulingType",
  });

  return (
    <div className={classNames("space-y-6", customClassNames?.wrapper)}>
      {team && !isManagedEventType && (
        <>
          {/* Assignment Type Section */}
          <div className={classNames("space-y-4", customClassNames?.assignmentType?.container)}>
            <div className="space-y-2">
              <Label className={classNames("text-sm font-semibold", customClassNames?.assignmentType?.label)}>
                {t("assignment")}
              </Label>
              <p
                className={classNames(
                  "text-sm text-gray-600",
                  customClassNames?.assignmentType?.description
                )}>
                {t("assignment_description")}
              </p>
            </div>
            <div>
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
                    onChange={(val) => {
                      onChange(val?.value);
                      resetRROptions();
                    }}
                  />
                )}
              />
            </div>
          </div>

          {/* Distribution Method Section for Round Robin */}
          {schedulingType === "ROUND_ROBIN" && (
            <div className={classNames("space-y-4", customClassNames?.distributionMethod?.container)}>
              <div className="space-y-2">
                <Label
                  className={classNames(
                    "text-sm font-semibold",
                    customClassNames?.distributionMethod?.label
                  )}>
                  {t("rr_distribution_method")}
                </Label>
                <p
                  className={classNames(
                    "text-sm text-gray-600",
                    customClassNames?.distributionMethod?.description
                  )}>
                  {t("rr_distribution_method_description")}
                </p>
              </div>
              <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                <Controller
                  name="maxLeadThreshold"
                  render={({ field: { value, onChange } }) => (
                    <RadioArea.Group
                      onValueChange={(val) => {
                        if (val === "loadBalancing") onChange(3);
                        else onChange(null);
                      }}
                      className="space-y-3">
                      <RadioArea.Item
                        value="maximizeAvailability"
                        checked={value === null}
                        className="w-full text-sm"
                        classNames={{ container: "w-full" }}>
                        <div className="space-y-1">
                          <div className="font-medium">{t("rr_distribution_method_availability_title")}</div>
                          <p className="text-gray-600">
                            {t("rr_distribution_method_availability_description")}
                          </p>
                        </div>
                      </RadioArea.Item>
                      {!!(
                        eventType.calIdTeam?.roundRobinTimestampBasis &&
                        eventType.calIdTeam?.roundRobinTimestampBasis !== RoundRobinTimestampBasis.CREATED_AT
                      ) ? (
                        <Tooltip content={t("rr_load_balancing_disabled")}>
                          <div className="w-full">
                            <RadioArea.Item
                              value="loadBalancing"
                              checked={value !== null}
                              className="text-sm"
                              disabled={true}
                              classNames={{ container: "w-full" }}>
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {t("rr_distribution_method_balanced_title")}
                                </div>
                                <p className="text-gray-600">
                                  {t("rr_distribution_method_balanced_description")}
                                </p>
                              </div>
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
                            <div className="space-y-1">
                              <div className="font-medium">{t("rr_distribution_method_balanced_title")}</div>
                              <p className="text-gray-600">
                                {t("rr_distribution_method_balanced_description")}
                              </p>
                            </div>
                          </RadioArea.Item>
                        </div>
                      )}
                    </RadioArea.Group>
                  )}
                />
                <Controller
                  name="includeNoShowInRRCalculation"
                  render={({ field: { value, onChange } }) => (
                    <SettingsToggle
                      title={t("include_no_show_in_rr_calculation")}
                      checked={value}
                      onCheckedChange={(val) => onChange(val)}
                    />
                  )}
                />
              </div>
            </div>
          )}

          {/* Hosts Section */}
          <Hosts
            orgId={orgId}
            isSegmentApplicable={isSegmentApplicable}
            teamId={team?.id || 0}
            calIdTeamId={eventType.calIdTeamId}
            assignAllTeamMembers={assignAllTeamMembers}
            setAssignAllTeamMembers={setAssignAllTeamMembers}
            teamMembers={teamMembersOptions}
            customClassNames={customClassNames?.hosts}
          />
        </>
      )}

      {/* Children Event Types Section for Managed Events */}
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
