import type { FormValues, Host, TeamMember } from "@calcom/features/eventtypes/lib/types";
import type { SchedulingType } from "@calcom/prisma/enums";
import { useEffect, useRef } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { FixedHostsCustomClassNames } from "./FixedHosts";
import { FixedHosts } from "./FixedHosts";
import type { RoundRobinHostsCustomClassNames } from "./RoundRobinHosts";
import { RoundRobinHosts } from "./RoundRobinHosts";

export type HostsCustomClassNames = {
  fixedHosts?: FixedHostsCustomClassNames;
  roundRobinHosts?: RoundRobinHostsCustomClassNames;
};

export const Hosts = ({
  orgId,
  teamId,
  teamMembers,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  customClassNames,
  isSegmentApplicable,
  hideFixedHostsForCollective = false,
}: {
  orgId: number | null;
  teamId: number;
  teamMembers: TeamMember[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: (value: boolean) => void;
  customClassNames?: HostsCustomClassNames;
  isSegmentApplicable: boolean;
  hideFixedHostsForCollective?: boolean;
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
          COLLECTIVE: hideFixedHostsForCollective ? (
            <></>
          ) : (
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
        return schedulingType ? schedulingTypeRender[schedulingType] : <></>;
      }}
    />
  );
};
