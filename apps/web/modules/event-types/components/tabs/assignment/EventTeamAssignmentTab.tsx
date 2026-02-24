import type {
  EventTypeSetupProps,
  FormValues,
  Host,
  PendingHostChanges,
  SelectClassNames,
  SettingsToggleClassNames,
} from "@calcom/features/eventtypes/lib/types";
import { useHosts } from "@calcom/features/eventtypes/lib/HostsContext";
import {
  usePaginatedAssignmentChildren,
  assignmentChildToChildrenEventType,
} from "@calcom/features/eventtypes/lib/usePaginatedAssignmentChildren";
import { usePaginatedAssignmentHosts } from "@calcom/features/eventtypes/lib/usePaginatedAssignmentHosts";
import { sortHosts } from "@calcom/lib/bookings/hostGroupUtils";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RRTimestampBasis, SchedulingType } from "@calcom/prisma/enums";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import {
  Label,
  Select,
  SettingsToggle,
  TextField,
} from "@calcom/ui/components/form";
import { XIcon } from "@coss/ui/icons";
import { RadioAreaGroup as RadioArea } from "@calcom/ui/components/radio";
import { Tooltip } from "@calcom/ui/components/tooltip";
import type { AddMembersWithSwitchCustomClassNames } from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";
import AddMembersWithSwitch from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";
import AssignAllTeamMembers from "@calcom/features/eventtypes/components/AssignAllTeamMembers";
import type {
  ChildrenEventType,
  ChildrenEventTypeSelectCustomClassNames,
} from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import ChildrenEventTypeSelect from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
import { EditWeightsForAllTeamMembers } from "@calcom/web/modules/event-types/components/EditWeightsForAllTeamMembers";
import { LearnMoreLink } from "@calcom/features/eventtypes/components/LearnMoreLink";
import WeightDescription from "@calcom/features/eventtypes/components/WeightDescription";
import {
  useSearchTeamMembers,
  type SearchTeamMember,
} from "@calcom/features/eventtypes/lib/useSearchTeamMembers";
import type { TFunction } from "i18next";
import Link from "next/link";
import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { Options } from "react-select";
import { v4 as uuidv4 } from "uuid";

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
  "team" | "eventType"
> & {
  customClassNames?: EventTeamAssignmentTabCustomClassNames;
  orgId: number | null;
  isSegmentApplicable: boolean;
  hideFixedHostsForCollective?: boolean;
};

const ChildrenEventTypesList = ({
  options = [],
  value,
  onChange,
  customClassNames,
  onSearchChange,
  onMenuScrollToBottom,
  isLoadingMore,
  assignedSearchValue,
  onAssignedSearchChange,
  ...rest
}: {
  value: ChildrenEventType[];
  onChange?: (options: ChildrenEventType[]) => void;
  options?: Options<ChildrenEventType>;
  customClassNames?: ChildrenEventTypeSelectCustomClassNames;
  onSearchChange?: (value: string) => void;
  onMenuScrollToBottom?: () => void;
  isLoadingMore?: boolean;
  assignedSearchValue?: string;
  onAssignedSearchChange?: (value: string) => void;
} & Omit<
  Partial<ComponentProps<typeof ChildrenEventTypeSelect>>,
  "onChange" | "value"
>) => {
  const { t } = useLocale();
  return (
    <div
      className={classNames(
        "stack-y-5 flex flex-col",
        customClassNames?.assignToSelect?.container
      )}
    >
      <div>
        <Label className={customClassNames?.assignToSelect?.label}>
          {t("assign_to")}
        </Label>
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
          options={options.filter(
            (opt) => !value.find((val) => val.owner.id.toString() === opt.value)
          )}
          controlShouldRenderValue={false}
          customClassNames={customClassNames}
          onSearchChange={onSearchChange}
          onMenuScrollToBottom={onMenuScrollToBottom}
          isLoadingMore={isLoadingMore}
          assignedSearchValue={assignedSearchValue}
          onAssignedSearchChange={onAssignedSearchChange}
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
        href="https://cal.com/docs/enterprise-features/teams/round-robin-scheduling#fixed-hosts"
      >
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
  value,
  onChange,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  isRoundRobinEvent = false,
  customClassNames,
  serverHosts,
  serverHasFixedHosts,
  pendingChanges,
  hasNextPageSelected,
  isFetchingNextPageSelected,
  fetchNextPageSelected,
  assignedSearch,
  onAssignedSearchChange,
  isSearchingAssigned,
}: {
  teamId: number;
  value: Host[];
  onChange: (hosts: Host[]) => void;
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  isRoundRobinEvent?: boolean;
  customClassNames?: FixedHostsCustomClassNames;
  serverHosts: Host[];
  serverHasFixedHosts: boolean;
  pendingChanges: PendingHostChanges;
  hasNextPageSelected?: boolean;
  isFetchingNextPageSelected?: boolean;
  fetchNextPageSelected?: () => void;
  assignedSearch: string;
  onAssignedSearchChange: (value: string) => void;
  isSearchingAssigned?: boolean;
}) => {
  const { t } = useLocale();
  const { clearAllHosts: clearAllHostsDelta } = useHosts();

  const hasActiveFixedHosts =
    isRoundRobinEvent &&
    (serverHasFixedHosts ||
      pendingChanges.hostsToAdd.some((h) => h.isFixed) ||
      pendingChanges.hostsToUpdate.some((u) => u.isFixed === true));

  const [isDisabled, setIsDisabled] = useState(hasActiveFixedHosts);

  // No-op: when "assign all" is toggled ON, the assignAllTeamMembers flag
  // is set by the AssignAllTeamMembers component. The booking system resolves
  // all members at booking time, so we don't need to create individual host entries.
  const handleFixedHostsActivation = useCallback(() => {}, []);

  const handleFixedHostsToggle = useCallback(
    (checked: boolean) => {
      if (!checked) {
        // Use clearAllHosts so the backend removes fixed hosts from ALL pages,
        // not just the currently loaded ones
        const rrHosts = value
          .filter((host) => !host.isFixed)
          .sort((a, b) => (b.priority ?? 2) - (a.priority ?? 2));
        clearAllHostsDelta(rrHosts);
      }
      setIsDisabled(checked);
    },
    [value, clearAllHostsDelta]
  );

  return (
    <div className={classNames("mt-5 rounded-lg", customClassNames?.container)}>
      {!isRoundRobinEvent ? (
        <>
          <div
            className={classNames(
              "border-subtle mt-5 rounded-t-md border p-6 pb-5",
              customClassNames?.container
            )}
          >
            <Label
              className={classNames(
                "mb-1 text-sm font-semibold",
                customClassNames?.label
              )}
            >
              {t("fixed_hosts")}
            </Label>
            <p
              className={classNames(
                "text-subtle wrap-break-word max-w-full text-sm leading-tight",
                customClassNames?.description
              )}
            >
              <FixedHostHelper t={t} />
            </p>
          </div>
          <div className="border-subtle rounded-b-md border border-t-0 px-6">
            <AddMembersWithSwitch
              teamId={teamId}
              groupId={null}
              value={value}
              onChange={onChange}
              assignAllTeamMembers={assignAllTeamMembers}
              setAssignAllTeamMembers={setAssignAllTeamMembers}
              automaticAddAllEnabled={!isRoundRobinEvent}
              isFixed={true}
              customClassNames={customClassNames?.addMembers}
              onActive={handleFixedHostsActivation}
              hasNextPageSelected={hasNextPageSelected}
              isFetchingNextPageSelected={isFetchingNextPageSelected}
              fetchNextPageSelected={fetchNextPageSelected}
              assignedSearchValue={assignedSearch}
              onAssignedSearchChange={onAssignedSearchChange}
              isSearchingAssigned={isSearchingAssigned}
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
          descriptionClassName={classNames(
            "text-sm text-subtle",
            customClassNames?.description
          )}
          switchContainerClassName={customClassNames?.container}
          onCheckedChange={handleFixedHostsToggle}
          childrenClassName={classNames("lg:ml-0", customClassNames?.children)}
        >
          <div className="border-subtle flex flex-col gap-6 rounded-bl-md rounded-br-md border border-t-0 px-6">
            <AddMembersWithSwitch
              data-testid="fixed-hosts-select"
              groupId={null}
              placeholder={t("add_a_member")}
              teamId={teamId}
              customClassNames={customClassNames?.addMembers}
              value={value}
              onChange={onChange}
              assignAllTeamMembers={assignAllTeamMembers}
              setAssignAllTeamMembers={setAssignAllTeamMembers}
              automaticAddAllEnabled={!isRoundRobinEvent}
              isFixed={true}
              onActive={handleFixedHostsActivation}
              hasNextPageSelected={hasNextPageSelected}
              isFetchingNextPageSelected={isFetchingNextPageSelected}
              fetchNextPageSelected={fetchNextPageSelected}
              assignedSearchValue={assignedSearch}
              onAssignedSearchChange={onAssignedSearchChange}
              isSearchingAssigned={isSearchingAssigned}
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
  value,
  onChange,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  customClassNames,
  teamId,
  isSegmentApplicable,
  serverHosts,
  hasNextPageSelected,
  isFetchingNextPageSelected,
  fetchNextPageSelected,
  assignedSearch,
  onAssignedSearchChange,
  isSearchingAssigned,
}: {
  orgId: number | null;
  value: Host[];
  onChange: (hosts: Host[]) => void;
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  customClassNames?: RoundRobinHostsCustomClassNames;
  teamId: number;
  isSegmentApplicable: boolean;
  serverHosts: Host[];
  hasNextPageSelected?: boolean;
  isFetchingNextPageSelected?: boolean;
  fetchNextPageSelected?: () => void;
  assignedSearch: string;
  onAssignedSearchChange: (value: string) => void;
  isSearchingAssigned?: boolean;
}) => {
  const { t } = useLocale();

  const { setHosts: setHostsFromContext } = useHosts();
  const { setValue, getValues, control, formState } =
    useFormContext<FormValues>();
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

  const handleWeightsEnabledChange = (
    active: boolean,
    onChange: (value: boolean) => void
  ) => {
    onChange(active);
    const allHosts = value;
    const fixedHosts = allHosts.filter((host) => host.isFixed);
    const rrHosts = allHosts.filter((host) => !host.isFixed);
    const sortedRRHosts = rrHosts.sort((a, b) => sortHosts(a, b, active));
    // Preserve fixed hosts when updating
    setHostsFromContext(serverHosts, [...fixedHosts, ...sortedRRHosts]);
  };

  const handleWeightsChange = (hosts: Host[]) => {
    const allHosts = value;
    const fixedHosts = allHosts.filter((host) => host.isFixed);
    const sortedRRHosts = hosts.sort((a, b) => sortHosts(a, b, true));
    // Preserve fixed hosts when updating
    setHostsFromContext(serverHosts, [...fixedHosts, ...sortedRRHosts]);
  };

  const handleAddGroup = useCallback(() => {
    const allHosts = value;
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
      setHostsFromContext(serverHosts, [...fixedHosts, ...updatedRRHosts]);
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
  }, [
    hostGroups,
    value,
    serverHosts,
    setHostsFromContext,
    setValue,
    assignAllTeamMembers,
    setAssignAllTeamMembers,
  ]);

  const handleGroupNameChange = useCallback(
    (groupId: string, newName: string) => {
      const updatedHostGroups =
        hostGroups?.map((g) =>
          g.id === groupId ? { ...g, name: newName } : g
        ) || [];
      setValue("hostGroups", updatedHostGroups, { shouldDirty: true });
    },
    [hostGroups, setValue]
  );

  const handleRemoveGroup = useCallback(
    (groupId: string) => {
      // Remove the group from hostGroups
      const updatedHostGroups =
        hostGroups?.filter((g) => g.id !== groupId) || [];
      setValue("hostGroups", updatedHostGroups, { shouldDirty: true });

      // Remove all hosts that belong to this group
      const updatedHosts = value.filter((host) => host.groupId !== groupId);
      onChange(updatedHosts);
      setHostsFromContext(serverHosts, updatedHosts);
    },
    [hostGroups, setValue, setHostsFromContext, serverHosts, value, onChange]
  );

  // No-op: when "assign all" is toggled ON, the assignAllTeamMembers flag
  // is set by the AssignAllTeamMembers component. The booking system resolves
  // all members at booking time, so we don't need to create individual host entries.
  const handleMembersActivation = useCallback((_groupId: string | null) => {},
  []);

  const renderAddMembersWithSwitch = (
    groupId: string | null,
    containerClassName?: string
  ) => (
    <AddMembersWithSwitch
      placeholder={t("add_a_member")}
      teamId={teamId}
      value={value}
      onChange={onChange}
      assignAllTeamMembers={assignAllTeamMembers}
      setAssignAllTeamMembers={setAssignAllTeamMembers}
      isSegmentApplicable={isSegmentApplicable}
      automaticAddAllEnabled={true}
      isRRWeightsEnabled={isRRWeightsEnabled}
      isFixed={false}
      groupId={groupId}
      containerClassName={
        containerClassName || (assignAllTeamMembers ? "-mt-4" : "")
      }
      onActive={() => handleMembersActivation(groupId)}
      customClassNames={customClassNames?.addMembers}
      hasNextPageSelected={hasNextPageSelected}
      isFetchingNextPageSelected={isFetchingNextPageSelected}
      fetchNextPageSelected={fetchNextPageSelected}
      assignedSearchValue={assignedSearch}
      onAssignedSearchChange={onAssignedSearchChange}
      isSearchingAssigned={isSearchingAssigned}
    />
  );

  const renderUnassignedHostsGroup = () => {
    const unassignedHosts = value.filter(
      (host) => !host.isFixed && !host.groupId
    );

    if (unassignedHosts.length === 0) {
      return null;
    }

    return (
      <div className="border-subtle my-4 rounded-md border p-4 pb-0">
        <div className="-mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-default text-sm font-medium">{`Group ${
              hostGroups.length + 1
            }`}</span>
          </div>
        </div>
        {renderAddMembersWithSwitch(null)}
      </div>
    );
  };

  return (
    <div className={classNames("rounded-lg")}>
      <div
        className={classNames(
          "border-subtle mt-5 rounded-t-md border p-6 pb-5",
          customClassNames?.container
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <Label
              className={classNames(
                "mb-1 text-sm font-semibold",
                customClassNames?.label
              )}
            >
              {t("round_robin_hosts")}
            </Label>
            <p
              className={classNames(
                "text-subtle wrap-break-word max-w-full text-sm leading-tight",
                customClassNames?.description
              )}
            >
              <LearnMoreLink
                t={t}
                i18nKey={
                  hostGroups?.length > 0
                    ? "round_robin_groups_helper"
                    : "round_robin_helper"
                }
                href="https://cal.com/help/event-types/round-robin"
              />
            </p>
          </div>
          <Button
            color="secondary"
            size="sm"
            StartIcon="plus"
            onClick={handleAddGroup}
          >
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
                switchContainerClassName={
                  customClassNames?.enableWeights?.container
                }
                labelClassName={customClassNames?.enableWeights?.label}
                descriptionClassName={
                  customClassNames?.enableWeights?.description
                }
                onCheckedChange={(active) =>
                  handleWeightsEnabledChange(active, onChange)
                }
              >
                <EditWeightsForAllTeamMembers
                  value={value}
                  onChange={handleWeightsChange}
                  assignAllTeamMembers={assignAllTeamMembers}
                  assignRRMembersUsingSegment={!!assignRRMembersUsingSegment}
                  eventTypeId={getValues("id")}
                  teamId={teamId}
                  queryValue={rrSegmentQueryValue}
                />
              </SettingsToggle>
            )}
          />
        </>
        {!hostGroups.length ? (
          renderAddMembersWithSwitch(hostGroups[0]?.id ?? null)
        ) : (
          <>
            {/* Show unassigned hosts first */}
            {renderUnassignedHostsGroup()}

            {/* Show all defined groups */}
            {hostGroups.map((group, index) => {
              const groupNumber = index + 1;

              return (
                <div
                  key={index}
                  className="border-subtle my-4 rounded-md border p-4 pb-0"
                >
                  <div className="-mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={group.name ?? ""}
                        onChange={(e) =>
                          handleGroupNameChange(group.id, e.target.value)
                        }
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
                  {renderAddMembersWithSwitch(group.id)}
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

function mapSearchMemberToChildrenOption(
  member: SearchTeamMember,
  slug: string,
  pendingString: string
): ChildrenEventType {
  return {
    slug,
    hidden: false,
    created: false,
    owner: {
      id: member.userId,
      name: member.name ?? "",
      email: member.email,
      username: member.username ?? "",
      membership: member.role,
      eventTypeSlugs: [],
      avatar: member.avatarUrl ?? "",
      profile: null,
    },
    value: `${member.userId}`,
    label: `${member.name || member.email || ""}${
      !member.username ? ` (${pendingString})` : ""
    }`,
  };
}

const ChildrenEventTypes = ({
  teamId,
  eventTypeId,
  eventSlug,
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  customClassNames,
}: {
  teamId: number;
  eventTypeId: number;
  eventSlug: string;
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  customClassNames?: ChildrenEventTypesCustomClassNames;
}) => {
  const { setValue, getValues } = useFormContext<FormValues>();
  const { t } = useLocale();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Dropdown search for adding new children
  const {
    members,
    fetchNextPage: fetchNextSearchPage,
    hasNextPage: hasNextSearchPage,
    isFetchingNextPage: isFetchingNextSearchPage,
  } = useSearchTeamMembers({
    teamId,
    search: debouncedSearch,
    enabled: !assignAllTeamMembers,
  });

  // Search for assigned children list
  const [assignedChildrenSearch, setAssignedChildrenSearch] = useState("");
  const debouncedAssignedChildrenSearch = useDebounce(assignedChildrenSearch, 300);

  // Paginated display of existing children
  const pendingChanges = getValues("pendingChildrenChanges") ?? {
    childrenToAdd: [],
    childrenToRemove: [],
    childrenToUpdate: [],
  };

  const {
    children: paginatedChildren,
    fetchNextPage: fetchNextChildrenPage,
    hasNextPage: hasNextChildrenPage,
    isFetchingNextPage: isFetchingNextChildrenPage,
    isFetching: isFetchingAssignedChildren,
  } = usePaginatedAssignmentChildren({
    eventTypeId,
    pendingChanges,
    search: debouncedAssignedChildrenSearch,
    enabled: !assignAllTeamMembers,
  });

  // Convert paginated children to ChildrenEventType format for display
  const displayChildren = useMemo(
    (): ChildrenEventType[] =>
      paginatedChildren.map((child) =>
        assignmentChildToChildrenEventType(child, t("pending"))
      ),
    [paginatedChildren, t]
  );

  // Convert search members to dropdown options, excluding already-assigned children
  const assignedOwnerIds = useMemo(() => {
    const ids = new Set(paginatedChildren.map((c) => c.owner.id));
    for (const child of pendingChanges.childrenToAdd) {
      ids.add(child.owner.id);
    }
    return ids;
  }, [paginatedChildren, pendingChanges.childrenToAdd]);

  const childrenOptions = useMemo(
    (): ChildrenEventType[] =>
      members
        .filter((member) => !assignedOwnerIds.has(member.userId))
        .map((member) =>
          mapSearchMemberToChildrenOption(member, eventSlug, t("pending"))
        ),
    [members, eventSlug, t, assignedOwnerIds]
  );

  const handleChildrenChange = useCallback(
    (newValue: readonly ChildrenEventType[]) => {
      const currentChildren = displayChildren;
      const newMap = new Map(newValue.map((c) => [c.owner.id, c]));
      const currentMap = new Map(currentChildren.map((c) => [c.owner.id, c]));

      // Find newly added children (in newValue but not in current)
      const added = newValue.filter((c) => !currentMap.has(c.owner.id));
      // Find removed children (in current but not in newValue)
      const removed = currentChildren.filter((c) => !newMap.has(c.owner.id));
      // Find hidden changes (same children but hidden toggled)
      const hiddenChanges: { userId: number; hidden: boolean }[] = [];
      for (const [ownerId, newChild] of Array.from(newMap.entries())) {
        const currentChild = currentMap.get(ownerId);
        if (currentChild && currentChild.hidden !== newChild.hidden) {
          hiddenChanges.push({ userId: ownerId, hidden: newChild.hidden });
        }
      }

      const current = getValues("pendingChildrenChanges") ?? {
        childrenToAdd: [],
        childrenToRemove: [],
        childrenToUpdate: [],
      };

      // Handle hidden changes on pending adds
      let updatedAdds = [...current.childrenToAdd];
      const serverHiddenChanges: { userId: number; hidden: boolean }[] = [];
      for (const change of hiddenChanges) {
        const addIndex = updatedAdds.findIndex(
          (c) => c.owner.id === change.userId
        );
        if (addIndex >= 0) {
          updatedAdds[addIndex] = {
            ...updatedAdds[addIndex],
            hidden: change.hidden,
          };
        } else {
          serverHiddenChanges.push(change);
        }
      }

      // Merge server hidden changes into childrenToUpdate
      let updatedUpdates = [...current.childrenToUpdate];
      for (const change of serverHiddenChanges) {
        const existingIndex = updatedUpdates.findIndex(
          (u) => u.userId === change.userId
        );
        if (existingIndex >= 0) {
          updatedUpdates[existingIndex] = {
            ...updatedUpdates[existingIndex],
            hidden: change.hidden,
          };
        } else {
          updatedUpdates.push(change);
        }
      }

      // Remove pending adds that were removed
      const removedIds = new Set(removed.map((c) => c.owner.id));
      updatedAdds = updatedAdds.filter((c) => !removedIds.has(c.owner.id));

      // For removals: only add to childrenToRemove if not a pending add
      const serverRemovals = removed
        .filter(
          (c) => !current.childrenToAdd.some((a) => a.owner.id === c.owner.id)
        )
        .map((c) => c.owner.id);

      const updatedChanges = {
        ...current,
        childrenToAdd: [
          ...updatedAdds,
          ...added.map((c) => ({
            ...c,
            created: false,
          })),
        ],
        childrenToRemove: [...current.childrenToRemove, ...serverRemovals],
        childrenToUpdate: updatedUpdates,
      };

      setValue("pendingChildrenChanges", updatedChanges, { shouldDirty: true });
    },
    [displayChildren, getValues, setValue]
  );

  return (
    <div
      className={classNames(
        "border-subtle stack-y-5 mt-6 rounded-lg border px-4 py-6 sm:px-6",
        customClassNames?.container
      )}
    >
      <div className="flex flex-col gap-4">
        <AssignAllTeamMembers
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          customClassNames={customClassNames?.assignAllTeamMembers}
          onActive={() =>
            setValue(
              "pendingChildrenChanges",
              {
                childrenToAdd: [],
                childrenToRemove: [],
                childrenToUpdate: [],
                clearAllChildren: true,
              },
              { shouldDirty: true }
            )
          }
        />
        {!assignAllTeamMembers ? (
          <>
            <ChildrenEventTypesList
              value={displayChildren}
              options={childrenOptions}
              onChange={(options) => {
                if (options) handleChildrenChange(options);
              }}
              customClassNames={customClassNames?.childrenEventTypesList}
              onSearchChange={setSearch}
              onMenuScrollToBottom={() => {
                if (hasNextSearchPage && !isFetchingNextSearchPage)
                  fetchNextSearchPage();
              }}
              isLoadingMore={isFetchingNextSearchPage}
              assignedSearchValue={assignedChildrenSearch}
              onAssignedSearchChange={setAssignedChildrenSearch}
              isSearchingAssigned={isFetchingAssignedChildren && !!debouncedAssignedChildrenSearch}
            />
          </>
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
  assignAllTeamMembers,
  setAssignAllTeamMembers,
  customClassNames,
  isSegmentApplicable,
  hideFixedHostsForCollective = false,
}: {
  orgId: number | null;
  teamId: number;
  assignAllTeamMembers: boolean;
  setAssignAllTeamMembers: Dispatch<SetStateAction<boolean>>;
  customClassNames?: HostsCustomClassNames;
  isSegmentApplicable: boolean;
  hideFixedHostsForCollective?: boolean;
}) => {
  const {
    control,
    formState: { submitCount },
  } = useFormContext<FormValues>();
  const {
    addHost,
    updateHost,
    removeHost,
    clearAllHosts,
    setHosts,
    pendingChanges,
  } = useHosts();

  const eventTypeId = useWatch({ control, name: "id" });

  const [assignedSearch, setAssignedSearch] = useState("");
  const debouncedAssignedSearch = useDebounce(assignedSearch, 300);

  const {
    hosts: paginatedHosts,
    serverHosts,
    serverHasFixedHosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching: isFetchingAssignedHosts,
  } = usePaginatedAssignmentHosts({
    eventTypeId,
    pendingChanges,
    search: debouncedAssignedSearch,
  });

  const schedulingType = useWatch({
    control,
    name: "schedulingType",
  });

  // Track scheduling type changes to reset hosts
  const initialValue = useRef<{
    pendingChanges: typeof pendingChanges;
    schedulingType: SchedulingType | null;
    submitCount: number;
  } | null>(null);

  useEffect(() => {
    // Handles init & out of date initial value after submission.
    if (
      !initialValue.current ||
      initialValue.current?.submitCount !== submitCount
    ) {
      initialValue.current = { pendingChanges, schedulingType, submitCount };
      return;
    }
    if (initialValue.current.schedulingType !== schedulingType) {
      // Scheduling type changed - clear all hosts
      // Uses clearAllHosts which sets a flag for the backend to compute the delta
      // This ensures ALL hosts are cleared, not just the paginated ones
      clearAllHosts();
    }
  }, [schedulingType, submitCount, clearAllHosts]);

  // To ensure existing host do not loose its scheduleId and groupId properties, whenever a new host of same type is added.
  // This is because the host is created from list option in CheckedHostField component.
  const updatedHosts = (changedHosts: Host[]) => {
    return changedHosts.map((newValue) => {
      const existingHost = paginatedHosts.find(
        (host: Host) => host.userId === newValue.userId
      );

      return existingHost
        ? {
            ...newValue,
            scheduleId: existingHost.scheduleId,
            groupId: existingHost.groupId,
          }
        : newValue;
    });
  };

  // handleHostsChange computes delta between current hosts and new hosts
  const handleHostsChange = useCallback(
    (newHosts: Host[]) => {
      setHosts(serverHosts, newHosts);
    },
    [setHosts, serverHosts]
  );

  const value = paginatedHosts; // hosts from paginated query (already merged with pending changes)

  const schedulingTypeRender = {
    COLLECTIVE: hideFixedHostsForCollective ? (
      <></>
    ) : (
      <FixedHosts
        teamId={teamId}
        value={value}
        onChange={(changeValue) => {
          handleHostsChange([...updatedHosts(changeValue)]);
        }}
        assignAllTeamMembers={assignAllTeamMembers}
        setAssignAllTeamMembers={setAssignAllTeamMembers}
        customClassNames={customClassNames?.fixedHosts}
        serverHosts={serverHosts}
        serverHasFixedHosts={serverHasFixedHosts}
        pendingChanges={pendingChanges}
        hasNextPageSelected={hasNextPage}
        isFetchingNextPageSelected={isFetchingNextPage}
        fetchNextPageSelected={fetchNextPage}
        assignedSearch={assignedSearch}
        onAssignedSearchChange={setAssignedSearch}
        isSearchingAssigned={isFetchingAssignedHosts && !!debouncedAssignedSearch}
      />
    ),
    ROUND_ROBIN: (
      <>
        <FixedHosts
          teamId={teamId}
          value={value}
          onChange={(changeValue) => {
            handleHostsChange([
              ...value.filter((host: Host) => !host.isFixed),
              ...updatedHosts(changeValue),
            ]);
          }}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          isRoundRobinEvent={true}
          customClassNames={customClassNames?.fixedHosts}
          serverHosts={serverHosts}
          serverHasFixedHosts={serverHasFixedHosts}
          pendingChanges={pendingChanges}
          hasNextPageSelected={hasNextPage}
          isFetchingNextPageSelected={isFetchingNextPage}
          fetchNextPageSelected={fetchNextPage}
          assignedSearch={assignedSearch}
          onAssignedSearchChange={setAssignedSearch}
          isSearchingAssigned={isFetchingAssignedHosts && !!debouncedAssignedSearch}
        />
        <RoundRobinHosts
          orgId={orgId}
          teamId={teamId}
          value={value}
          onChange={(changeValue) => {
            const newHosts = [
              ...value.filter((host: Host) => host.isFixed),
              ...updatedHosts(changeValue),
            ];
            handleHostsChange(newHosts);
          }}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          customClassNames={customClassNames?.roundRobinHosts}
          isSegmentApplicable={isSegmentApplicable}
          serverHosts={serverHosts}
          hasNextPageSelected={hasNextPage}
          isFetchingNextPageSelected={isFetchingNextPage}
          fetchNextPageSelected={fetchNextPage}
          assignedSearch={assignedSearch}
          onAssignedSearchChange={setAssignedSearch}
          isSearchingAssigned={isFetchingAssignedHosts && !!debouncedAssignedSearch}
        />
      </>
    ),
    MANAGED: <></>,
  };

  return schedulingType ? schedulingTypeRender[schedulingType] : <></>;
};

export const EventTeamAssignmentTab = ({
  team,
  eventType,
  customClassNames,
  orgId,
  isSegmentApplicable,
  hideFixedHostsForCollective = false,
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
  const isManagedEventType =
    eventType.schedulingType === SchedulingType.MANAGED;
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
    (
      schedulingType: SchedulingType | undefined,
      onChange: (value: SchedulingType | undefined) => void
    ) => {
      if (schedulingType) {
        onChange(schedulingType);
        resetRROptions();
      }
    },
    [setValue, setAssignAllTeamMembers]
  );

  const handleMaxLeadThresholdChange = (
    val: string,
    onChange: (value: number | null) => void
  ) => {
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
            )}
          >
            <div className="border-subtle rounded-t-md border p-6 pb-5">
              <Label
                className={classNames(
                  "mb-1 text-sm font-semibold",
                  customClassNames?.assignmentType?.label
                )}
              >
                {t("assignment")}
              </Label>
              <p
                className={classNames(
                  "text-subtle wrap-break-word max-w-full text-sm leading-tight",
                  customClassNames?.assignmentType?.description
                )}
              >
                {t("assignment_description")}
              </p>
            </div>
            <div
              className={classNames(
                "border-subtle rounded-b-md border border-t-0 p-6",
                customClassNames?.assignmentType?.schedulingTypeSelect
                  ?.container
              )}
            >
              <Label
                className={
                  customClassNames?.assignmentType?.schedulingTypeSelect?.label
                }
              >
                {t("scheduling_type")}
              </Label>
              <Controller<FormValues>
                name="schedulingType"
                render={({ field: { value, onChange } }) => (
                  <Select
                    options={schedulingTypeOptions}
                    value={schedulingTypeOptions.find(
                      (opt) => opt.value === value
                    )}
                    className={classNames(
                      "w-full",
                      customClassNames?.assignmentType?.schedulingTypeSelect
                        ?.select
                    )}
                    innerClassNames={
                      customClassNames?.assignmentType?.schedulingTypeSelect
                        ?.innerClassNames
                    }
                    onChange={(val) =>
                      handleSchedulingTypeChange(val?.value, onChange)
                    }
                  />
                )}
              />
            </div>
          </div>
          {schedulingType === "ROUND_ROBIN" && (
            <div className="border-subtle mt-4 flex flex-col rounded-md">
              <div className="border-subtle rounded-t-md border p-6 pb-5">
                <Label className="mb-1 text-sm font-semibold">
                  {t("rr_distribution_method")}
                </Label>
                <p className="text-subtle wrap-break-word max-w-full text-sm leading-tight">
                  {t("rr_distribution_method_description")}
                </p>
              </div>
              <div className="border-subtle rounded-b-md border border-t-0 p-6">
                <Controller
                  name="maxLeadThreshold"
                  render={({ field: { value, onChange } }) => (
                    <RadioArea.Group
                      onValueChange={(val) =>
                        handleMaxLeadThresholdChange(val, onChange)
                      }
                      className="mt-1 flex flex-col gap-4"
                    >
                      <RadioArea.Item
                        value="maximizeAvailability"
                        checked={value === null}
                        className="w-full text-sm"
                        classNames={{ container: "w-full" }}
                      >
                        <strong className="mb-1 block">
                          {t("rr_distribution_method_availability_title")}
                        </strong>
                        <p>
                          {t("rr_distribution_method_availability_description")}
                        </p>
                      </RadioArea.Item>
                      {(eventType.team?.rrTimestampBasis &&
                        eventType.team?.rrTimestampBasis !==
                          RRTimestampBasis.CREATED_AT) ||
                      hostGroups?.length > 1 ? (
                        <Tooltip
                          content={
                            eventType.team?.rrTimestampBasis &&
                            eventType.team?.rrTimestampBasis !==
                              RRTimestampBasis.CREATED_AT
                              ? t("rr_load_balancing_disabled")
                              : t("rr_load_balancing_disabled_with_groups")
                          }
                        >
                          <div className="w-full">
                            <RadioArea.Item
                              value="loadBalancing"
                              checked={value !== null}
                              className="text-sm"
                              disabled={true}
                              classNames={{ container: "w-full" }}
                            >
                              <strong className="mb-1">
                                {t("rr_distribution_method_balanced_title")}
                              </strong>
                              <p>
                                {t(
                                  "rr_distribution_method_balanced_description"
                                )}
                              </p>
                            </RadioArea.Item>
                          </div>
                        </Tooltip>
                      ) : (
                        <div className="w-full">
                          <RadioArea.Item
                            value="loadBalancing"
                            checked={value !== null}
                            className="text-sm"
                            classNames={{ container: "w-full" }}
                          >
                            <strong className="mb-1">
                              {t("rr_distribution_method_balanced_title")}
                            </strong>
                            <p>
                              {t("rr_distribution_method_balanced_description")}
                            </p>
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
            customClassNames={customClassNames?.hosts}
            hideFixedHostsForCollective={hideFixedHostsForCollective}
          />
        </>
      )}
      {team && isManagedEventType && (
        <ChildrenEventTypes
          teamId={team.id}
          eventTypeId={eventType.id}
          eventSlug={eventType.slug}
          assignAllTeamMembers={assignAllTeamMembers}
          setAssignAllTeamMembers={setAssignAllTeamMembers}
          customClassNames={customClassNames?.childrenEventTypes}
        />
      )}
    </div>
  );
};
