import { Trans } from "next-i18next";
import Link from "next/link";
import type { EventTypeSetupProps, Host } from "pages/event-types/[type]";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { Options } from "react-select";

import AddMembersWithSwitch, {
  mapUserToValue,
} from "@calcom/features/eventtypes/components/AddMembersWithSwitch";
import AssignAllTeamMembers from "@calcom/features/eventtypes/components/AssignAllTeamMembers";
import ChildrenEventTypeSelect from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import type { FormValues, TeamMember } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { Label, Select, SettingsToggle } from "@calcom/ui";

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
    },
    value: `${member.id ?? ""}`,
    label: `${member.name || member.email || ""}${!member.username ? ` (${pendingString})` : ""}`,
  };
};

const ChildrenEventTypesList = ({
  options = [],
  value,
  onChange,
  ...rest
}: {
  value: ReturnType<typeof mapMemberToChildrenOption>[];
  onChange?: (options: ReturnType<typeof mapMemberToChildrenOption>[]) => void;
  options?: Options<ReturnType<typeof mapMemberToChildrenOption>>;
} & Omit<Partial<ComponentProps<typeof ChildrenEventTypeSelect>>, "onChange" | "value">) => {
  const { t } = useLocale();
  return (
    <div className="flex flex-col space-y-5">
      <div>
        <Label>{t("assign_to")}</Label>
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
          {...rest}
        />
      </div>
    </div>
  );
};

const FixedHostHelper = (
  <Trans i18nKey="fixed_host_helper">
    Add anyone who needs to attend the event.
    <Link
      className="underline underline-offset-2"
      target="_blank"
      href="https://cal.com/docs/enterprise-features/teams/round-robin-scheduling#fixed-hosts">
      Learn more
    </Link>
  </Trans>
);

const FixedHosts = ({
  teamMembers,
  value,
  onChange,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  isRoundRobinEvent = false,
}: {
  value: Host[];
  onChange: (hosts: Host[]) => void;
  teamMembers: TeamMember[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  isRoundRobinEvent?: boolean;
}) => {
  const { t } = useLocale();
  const { getValues, setValue } = useFormContext<FormValues>();

  const hasActiveFixedHosts = isRoundRobinEvent && getValues("hosts").some((host) => host.isFixed);

  const [isDisabled, setIsDisabled] = useState(hasActiveFixedHosts);

  return (
    <div className="mt-5 rounded-lg">
      {!isRoundRobinEvent ? (
        <>
          <div className="border-subtle mt-5 rounded-t-md border p-6 pb-5">
            <Label className="mb-1 text-sm font-semibold">{t("fixed_hosts")}</Label>
            <p className="text-subtle max-w-full break-words text-sm leading-tight">{FixedHostHelper}</p>
          </div>
          <div className="border-subtle rounded-b-md border border-t-0">
            <AddMembersWithSwitch
              teamMembers={teamMembers}
              value={value}
              onChange={onChange}
              assignAllTeamMembers={assignAllTeamMembers}
              setAssignAllTeamMembers={setAssignAllTeamMembers}
              automaticAddAllEnabled={!isRoundRobinEvent}
              isFixed={true}
              onActive={() =>
                setValue(
                  "hosts",
                  teamMembers.map((teamMember) => ({
                    isFixed: true,
                    userId: parseInt(teamMember.value, 10),
                    priority: 2,
                  })),
                  { shouldDirty: true }
                )
              }
            />
          </div>
        </>
      ) : (
        <SettingsToggle
          toggleSwitchAtTheEnd={true}
          title={t("fixed_hosts")}
          description={FixedHostHelper}
          checked={isDisabled}
          labelClassName="text-sm"
          descriptionClassName=" text-sm text-subtle"
          onCheckedChange={(checked) => {
            if (!checked) {
              const rrHosts = getValues("hosts")
                .filter((host) => !host.isFixed)
                .sort((a, b) => (b.priority ?? 2) - (a.priority ?? 2));
              setValue("hosts", rrHosts, { shouldDirty: true });
            }
            setIsDisabled(checked);
          }}
          childrenClassName="lg:ml-0">
          <div className="border-subtle flex flex-col gap-6 rounded-bl-md rounded-br-md border border-t-0">
            <AddMembersWithSwitch
              teamMembers={teamMembers}
              value={value}
              onChange={onChange}
              assignAllTeamMembers={assignAllTeamMembers}
              setAssignAllTeamMembers={setAssignAllTeamMembers}
              automaticAddAllEnabled={!isRoundRobinEvent}
              isFixed={true}
              onActive={() =>
                setValue(
                  "hosts",
                  teamMembers.map((teamMember) => ({
                    isFixed: true,
                    userId: parseInt(teamMember.value, 10),
                    priority: 2,
                  })),
                  { shouldDirty: true }
                )
              }
            />
          </div>
        </SettingsToggle>
      )}
    </div>
  );
};

const RoundRobinHosts = ({
  teamMembers,
  value,
  onChange,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
}: {
  value: Host[];
  onChange: (hosts: Host[]) => void;
  teamMembers: TeamMember[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
}) => {
  const { t } = useLocale();

  const { setValue } = useFormContext<FormValues>();

  return (
    <div className="rounded-lg ">
      <div className="border-subtle mt-5 rounded-t-md border p-6 pb-5">
        <Label className="mb-1 text-sm font-semibold">{t("round_robin_hosts")}</Label>
        <p className="text-subtle max-w-full break-words text-sm leading-tight">{t("round_robin_helper")}</p>
      </div>
      <div className="border-subtle rounded-b-md border border-t-0">
        <AddMembersWithSwitch
          teamMembers={teamMembers}
          value={value}
          onChange={onChange}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          automaticAddAllEnabled={true}
          isFixed={false}
          onActive={() =>
            setValue(
              "hosts",
              teamMembers
                .map((teamMember) => ({
                  isFixed: false,
                  userId: parseInt(teamMember.value, 10),
                  priority: 2,
                }))
                .sort((a, b) => b.priority - a.priority),
              { shouldDirty: true }
            )
          }
        />
      </div>
    </div>
  );
};

const ChildrenEventTypes = ({
  childrenEventTypeOptions,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
}: {
  childrenEventTypeOptions: ReturnType<typeof mapMemberToChildrenOption>[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
}) => {
  const { setValue } = useFormContext<FormValues>();
  return (
    <div className="border-subtle mt-6 space-y-5 rounded-lg border px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4">
        <AssignAllTeamMembers
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          onActive={() => setValue("children", childrenEventTypeOptions, { shouldDirty: true })}
        />
        {!assignAllTeamMembers ? (
          <Controller<FormValues>
            name="children"
            render={({ field: { onChange, value } }) => (
              <ChildrenEventTypesList value={value} options={childrenEventTypeOptions} onChange={onChange} />
            )}
          />
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

const Hosts = ({
  teamMembers,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
}: {
  teamMembers: TeamMember[];
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
}) => {
  const { t } = useLocale();
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

  return (
    <Controller<FormValues>
      name="hosts"
      render={({ field: { onChange, value } }) => {
        const schedulingTypeRender = {
          COLLECTIVE: (
            <FixedHosts
              teamMembers={teamMembers}
              value={value}
              onChange={onChange}
              assignAllTeamMembers={assignAllTeamMembers}
              setAssignAllTeamMembers={setAssignAllTeamMembers}
            />
          ),
          ROUND_ROBIN: (
            <>
              <FixedHosts
                teamMembers={teamMembers}
                value={value}
                onChange={(changeValue) => {
                  onChange([...value.filter((host: Host) => !host.isFixed), ...changeValue]);
                }}
                assignAllTeamMembers={assignAllTeamMembers}
                setAssignAllTeamMembers={setAssignAllTeamMembers}
                isRoundRobinEvent={true}
              />
              <RoundRobinHosts
                teamMembers={teamMembers}
                value={value}
                onChange={(changeValue) => {
                  onChange(
                    [...value.filter((host: Host) => host.isFixed), ...changeValue].sort(
                      (a, b) => b.priority - a.priority
                    )
                  );
                }}
                assignAllTeamMembers={assignAllTeamMembers}
                setAssignAllTeamMembers={setAssignAllTeamMembers}
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

export const EventTeamTab = ({
  team,
  teamMembers,
  eventType,
}: Pick<EventTypeSetupProps, "teamMembers" | "team" | "eventType">) => {
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
      { ...member, eventTypes: member.eventTypes.filter((et) => et !== eventType.slug) },
      eventType.slug,
      t("pending")
    );
  });
  const isManagedEventType = eventType.schedulingType === SchedulingType.MANAGED;
  const { getValues, setValue } = useFormContext<FormValues>();
  const [assignAllTeamMembers, setAssignAllTeamMembers] = useState<boolean>(
    getValues("assignAllTeamMembers") ?? false
  );

  return (
    <div>
      {team && !isManagedEventType && (
        <>
          <div className="border-subtle flex flex-col rounded-md">
            <div className="border-subtle rounded-t-md border p-6 pb-5">
              <Label className="mb-1 text-sm font-semibold">{t("assignment")}</Label>
              <p className="text-subtle max-w-full break-words text-sm leading-tight">
                {t("assignment_description")}
              </p>
            </div>
            <div className="border-subtle rounded-b-md border border-t-0 p-6">
              <Label>{t("scheduling_type")}</Label>
              <Controller<FormValues>
                name="schedulingType"
                render={({ field: { value, onChange } }) => (
                  <Select
                    options={schedulingTypeOptions}
                    value={schedulingTypeOptions.find((opt) => opt.value === value)}
                    className="w-full"
                    onChange={(val) => {
                      onChange(val?.value);
                      setValue("assignAllTeamMembers", false, { shouldDirty: true });
                      setAssignAllTeamMembers(false);
                    }}
                  />
                )}
              />
            </div>
          </div>
          <Hosts
            assignAllTeamMembers={assignAllTeamMembers}
            setAssignAllTeamMembers={setAssignAllTeamMembers}
            teamMembers={teamMembersOptions}
          />
        </>
      )}
      {team && isManagedEventType && (
        <ChildrenEventTypes
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          childrenEventTypeOptions={childrenEventTypeOptions}
        />
      )}
    </div>
  );
};
