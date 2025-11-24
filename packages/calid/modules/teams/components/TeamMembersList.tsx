"use client";

import { cn } from "@calid/features/lib/cn";
import { Avatar } from "@calid/features/ui/components/avatar";
import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogClose,
} from "@calid/features/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calid/features/ui/components/dropdown-menu";
import { Icon } from "@calid/features/ui/components/icon";
import { TextField } from "@calid/features/ui/components/input/input";
import { triggerToast } from "@calid/features/ui/components/toast";
import { keepPreviousData } from "@tanstack/react-query";
import {
  flexRender,
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import React from "react";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";

import { Checkbox } from "../../../ui/components/input/checkbox-field";
import { AddTeamMemberModal } from "./AddTeamMemberModal";
import { EditTeamMemberRoleModal } from "./EditTeamMemberRoleModal";
import { TeamMembersListSkeletonLoader } from "./TeamMembersListSkeletonLoader";

export type TeamMemberData = RouterOutputs["viewer"]["calidTeams"]["listMembers"]["members"][number];

interface TeamMembersListProps {
  team: NonNullable<RouterOutputs["viewer"]["calidTeams"]["get"]>;
  onMemberSelect?: (member: TeamMemberData) => void;
  onMemberEdit?: (member: TeamMemberData) => void;
  onMemberRemove?: (member: TeamMemberData) => void;
  onInviteClick?: () => void;
  enableBulkActions?: boolean;
}

const columnHelper = createColumnHelper<TeamMemberData>();

export function TeamMembersList({
  team,
  onMemberSelect,
  onMemberEdit,
  onMemberRemove,
  onInviteClick,
  enableBulkActions = true,
}: TeamMembersListProps) {
  const { t, i18n } = useLocale();
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Use the team member operations hook for member management
  const { removeMember, isRemoving, updateMemberRole, isUpdating, resendInviteMutation } =
    useTeamMemberOperations(team.id);

  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});

  // State for removal confirmation dialogs
  const [memberToRemove, setMemberToRemove] = useState<TeamMemberData | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showBulkRemoveDialog, setShowBulkRemoveDialog] = useState(false);
  const [membersToRemove, setMembersToRemove] = useState<TeamMemberData[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [allLoadedMembers, setAllLoadedMembers] = useState<TeamMemberData[]>([]);

  // State for edit role modal
  const [memberToEdit, setMemberToEdit] = useState<TeamMemberData | null>(null);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);

  // State for impersonation modal
  const [memberToImpersonate, setMemberToImpersonate] = useState<TeamMemberData | null>(null);
  const [showImpersonationDialog, setShowImpersonationDialog] = useState(false);

  const { data: membersData, isLoading } = trpc.viewer.calidTeams.listMembers.useQuery(
    { teamId: team.id, limit: 25, searchQuery, paging: currentPage },
    {
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
      enabled: !!team.id,
    }
  );

  useEffect(() => {
    if (membersData?.members) {
      if (currentPage === 0) {
        setAllLoadedMembers(membersData.members);
      } else {
        setAllLoadedMembers((prev) => [...prev, ...membersData.members]);
      }
    }
  }, [membersData, currentPage]);

  const allMembers = useMemo(() => allLoadedMembers, [allLoadedMembers]);

  const navigateToNextPage = useCallback(() => {
    if (membersData?.nextPaging != null) setCurrentPage((prev) => prev + 1);
  }, [membersData?.nextPaging]);

  // Fetch team round-robin event types for bulk-adding hosts
  const { data: eventTypesData } = trpc.viewer.eventTypes.getByViewer.useQuery({
    filters: { teamIds: [team.id], schedulingTypes: [SchedulingType.ROUND_ROBIN] },
  });

  const addMembersToEventTypesMutation = trpc.viewer.calidTeams.addMembersToEventType.useMutation({
    onSuccess: (_res, variables) => {
      const userCount = variables.userIds.length;
      const eventCount = variables.eventTypeIds.length;
      triggerToast(`${userCount} users added to ${eventCount} events`, "success");
      utils.viewer.calidTeams.listMembers.invalidate();
      utils.viewer.eventTypes.invalidate();
      setSelectedMembers({});
    },
    onError: (error) => {
      triggerToast(error.message, "error");
    },
  });

  function addMembersToEventTypes() {
    const selectedUserIds = Object.keys(selectedMembers)
      .filter((id) => selectedMembers[id])
      .map((id) => Number(id));

    if (selectedUserIds.length === 0) {
      triggerToast(t("no_members_selected"), "error");
      return;
    }

    const groups = eventTypesData?.eventTypeGroups ?? [];
    const eventTypeIds = groups.flatMap((g) => g.eventTypes.map((e) => e.id));

    if (eventTypeIds.length === 0) {
      triggerToast(t("no_event_types_available"), "error");
      return;
    }

    addMembersToEventTypesMutation.mutate({
      userIds: selectedUserIds,
      eventTypeIds,
      teamId: team.id,
    });
  }

  const handleRoleUpdate = (memberId: number, role: MembershipRole) => {
    updateMemberRole(memberId, role);
    setShowEditRoleModal(false);
    setMemberToEdit(null);
  };

  const canManageMembers = useMemo(() => {
    if (!team?.membership) return false;
    return team.membership.role === "OWNER" || team.membership.role === "ADMIN";
  }, [team]);

  const canImpersonateMember = useCallback(
    (member: TeamMemberData) => {
      if (!canManageMembers) return false;
      if (member.user.id === session?.user?.id) return false; // Can't impersonate self
      if (member.user.disableImpersonation) return false; // User has disabled impersonation
      if (!member.acceptedInvitation) return false; // User hasn't accepted invitation
      return true;
    },
    [canManageMembers, session?.user?.id]
  );

  const formatLastActive = useCallback((lastActiveAt: string | null) => {
    if (!lastActiveAt) return "Never";
    const date = new Date(lastActiveAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }, []);

  const columns = useMemo(() => {
    const baseColumns = [
      ...(enableBulkActions
        ? [
            columnHelper.display({
              id: "select",
              size: 50,
              minSize: 50,
              maxSize: 50,
              header: ({ table }) => {
                const visibleRows = table.getRowModel().rows;
                const allSelected = visibleRows.length > 0 && visibleRows.every((r) => r.getIsSelected());
                const someSelected = visibleRows.some((r) => r.getIsSelected());

                return (
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onCheckedChange={(value) => {
                      visibleRows.forEach((r) => r.toggleSelected(!!value));
                    }}
                    aria-label="Select all members"
                  />
                );
              },
              cell: ({ row }) => (
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  aria-label={`Select ${row.original.user.name || row.original.user.email}`}
                />
              ),
            }),
          ]
        : []),

      columnHelper.accessor((m) => m.user.email ?? "", {
        id: "member",
        header: "Team Member",
        size: 500,
        minSize: 300,
        cell: ({ row }) => {
          const member = row.original;
          const displayName =
            member.user.name ||
            member.user.username ||
            (member.user.email ? member.user.email.split("@")[0] : "Unknown");

          return (
            <div
              className="flex cursor-pointer items-center gap-3 py-2"
              onClick={() => onMemberSelect?.(member)}>
              <Avatar
                size="md"
                alt={displayName}
                imageSrc={getUserAvatarUrl({
                  avatarUrl: member.user.avatarUrl ?? null,
                })}
                className="ring-2 ring-gray-100"
              />
              <div className="min-w-0 flex-1">
                <p className="text-emphasis truncate text-sm font-medium">{displayName}</p>
                <p className="text-subtle truncate text-xs">{member.user.email}</p>
              </div>
            </div>
          );
        },
      }),

      columnHelper.accessor("role", {
        header: "Role",
        size: 300,
        minSize: 150,
        cell: ({ row }) => {
          const member = row.original;
          const roleDisplay = member.role.toLowerCase();

          return (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="p-0">
                {roleDisplay.charAt(0).toUpperCase() + roleDisplay.slice(1).toLowerCase()}
              </Badge>
              {!member.acceptedInvitation && (
                <Badge size="sm" variant="attention">
                  {t("pending")}
                </Badge>
              )}
            </div>
          );
        },
      }),

      columnHelper.accessor((row) => row.user.lastActiveAt, {
        id: "lastActiveAt",
        header: "Last Active",
        size: 300,
        minSize: 150,
        cell: ({ row }) => (
          <span className="text-default text-sm">
            {formatLastActive(
              row.original.user.lastActiveAt
                ? row.original.user.lastActiveAt instanceof Date
                  ? row.original.user.lastActiveAt.toISOString()
                  : row.original.user.lastActiveAt
                : null
            )}
          </span>
        ),
      }),
    ];

    if (canManageMembers) {
      baseColumns.push(
        columnHelper.display({
          id: "actions",
          size: 300,
          minSize: 100,
          cell: ({ row }) => {
            const member = row.original;
            const isCurrentUser = member.user.id === session?.user?.id;
            const canEditMember =
              !isCurrentUser &&
              (team?.membership?.role === MembershipRole.OWNER ||
                (team?.membership?.role === MembershipRole.ADMIN && member.role !== MembershipRole.OWNER));

            const username = member.user.username;

            return (
              <div className="flex w-full justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button StartIcon="ellipsis" variant="icon" color="minimal" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {member.acceptedInvitation && username && (
                      <DropdownMenuItem StartIcon="eye" onClick={() => window.open(`/${username}`, "_blank")}>
                        {t("view_member_public_page")}
                      </DropdownMenuItem>
                    )}
                    {canEditMember && (
                      <DropdownMenuItem
                        StartIcon="pencil-line"
                        onClick={() => {
                          if (onMemberEdit) {
                            onMemberEdit(member);
                          } else {
                            setMemberToEdit(member);
                            setShowEditRoleModal(true);
                          }
                        }}>
                        {t("edit_team_member")}
                      </DropdownMenuItem>
                    )}
                    {canEditMember && canImpersonateMember(member) && (
                      <DropdownMenuItem
                        StartIcon="shield"
                        onClick={() => {
                          setMemberToImpersonate(member);
                          setShowImpersonationDialog(true);
                        }}>
                        {t("impersonate")}
                      </DropdownMenuItem>
                    )}
                    {!member.acceptedInvitation && canEditMember && (
                      <DropdownMenuItem
                        StartIcon="mail"
                        onClick={() => {
                          resendInviteMutation.mutate({
                            teamId: team.id,
                            email: member.user.email as string,
                            language: i18n.language,
                          });
                        }}
                        disabled={resendInviteMutation.isPending}>
                        {
                          // resendInviteMutation.isPending ? t("sending") :
                          t("resend_invite_to_team_member")
                        }
                      </DropdownMenuItem>
                    )}
                    {canEditMember && (
                      <DropdownMenuItem
                        StartIcon="trash-2"
                        color="destructive"
                        onClick={() => {
                          if (onMemberRemove) {
                            onMemberRemove(member);
                          } else {
                            setMemberToRemove(member);
                            setShowRemoveDialog(true);
                          }
                        }}
                        disabled={isRemoving}>
                        {isRemoving ? t("removing") : t("remove_team_member")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          },
        })
      );
    }

    return baseColumns;
  }, [
    enableBulkActions,
    canManageMembers,
    canImpersonateMember,
    session?.user?.id,
    team,
    onMemberSelect,
    onMemberEdit,
    onMemberRemove,
    formatLastActive,
    t,
    i18n.language,
    isRemoving,
    resendInviteMutation,
  ]);

  const table = useReactTable({
    data: allMembers,
    columns,
    state: {
      sorting,
      rowSelection: selectedMembers,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setSelectedMembers,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id.toString(), // keep if `id` is the membership id
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  // Calculate total minimum width to ensure columns don't shrink below their minimums
  const totalMinWidth = useMemo(() => {
    return table.getAllColumns().reduce((sum, column) => {
      const minSize = (column.columnDef as { minSize?: number }).minSize;
      return sum + (minSize || column.getSize());
    }, 0);
  }, [table]);

  const selectedCount = Object.keys(selectedMembers).length;

  if (isLoading) {
    return <TeamMembersListSkeletonLoader />;
  }

  return (
    <div className="space-y-4">
      {/* Header with search and actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <TextField
            addOnLeading={<Icon name="search" className="text-subtle h-4 w-4" />}
            addOnClassname="!border-muted"
            containerClassName={cn("focus:!ring-offset-0 py-2")}
            type="search"
            autoComplete="off"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("search")}
          />
          <AddTeamMemberModal
            teamId={team.id}
            teamName={team.name}
            onSuccess={() => {
              utils.viewer.calidTeams.listMembers.invalidate();
            }}
          />
        </div>
      </div>

      {/* Members count */}
      <div className="flex items-center justify-between">
        <p className="text-subtle text-sm">
          {allMembers.length} {allMembers.length === 1 ? "member" : "members"}
        </p>
        {membersData?.nextPaging && (
          <Button variant="button" size="sm" onClick={navigateToNextPage} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        )}
      </div>

      {/* Table container */}
      <div
        ref={tableContainerRef}
        className="border-default bg-primary overflow-auto rounded-lg border"
        style={{ height: "600px" }}>
        {/* Table header */}
        {table.getHeaderGroups().map((headerGroup) => (
          <div
            key={headerGroup.id}
            className="border-subtle bg-muted sticky top-0 z-10 flex w-full border-b"
            style={{ minWidth: `${totalMinWidth}px` }}>
            {headerGroup.headers.map((header) => (
              <div
                key={header.id}
                className="flex flex-1 items-center px-4 py-3 text-left"
                style={{
                  minWidth: header.column.columnDef.minSize || header.getSize(),
                  ...(header.column.id === "select" && {
                    maxWidth: `${header.column.columnDef.maxSize || 50}px`,
                  }),
                }}>
                {header.isPlaceholder ? null : (
                  <div
                    className={`flex items-center gap-2 ${
                      header.column.getCanSort() ? "cursor-pointer select-none" : ""
                    }`}
                    onClick={header.column.getToggleSortingHandler()}>
                    <span className="text-emphasis text-sm font-medium">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                    {header.column.getCanSort() && (
                      <span className="text-subtle">
                        {{
                          asc: "↑",
                          desc: "↓",
                        }[header.column.getIsSorted() as string] ?? "↕"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Virtual table body */}
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={row.id}
                className="border-default absolute flex w-full items-center border-b transition-colors"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  minWidth: `${totalMinWidth}px`,
                }}>
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className="flex flex-1 items-center px-4 py-2"
                    style={{
                      minWidth: cell.column.columnDef.minSize || cell.column.getSize(),
                      ...(cell.column.id === "select" && {
                        maxWidth: `${cell.column.columnDef.maxSize || 50}px`,
                      }),
                    }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulk actions bar */}
      {enableBulkActions && selectedCount > 0 && (
        <div className="border-subtle bg-primary fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-md border px-4 py-2 shadow-md">
          <span className="text-brand-subtle text-sm font-medium">
            {selectedCount} member{selectedCount > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            {selectedCount > 1 && (
              <Button
                StartIcon="users"
                color="secondary"
                variant="button"
                size="sm"
                onClick={() => {
                  const selectedMemberIds = Object.keys(selectedMembers);
                  const membersToInclude = allMembers.filter((m) =>
                    selectedMemberIds.includes(m.id.toString())
                  );
                  const usernames = membersToInclude.map((m) => m.user.username).filter(Boolean) as string[];

                  if (usernames.length > 0) {
                    const url = `/${usernames.join("+")}`;
                    window.open(url, "_blank");
                  } else {
                    triggerToast(t("no_usernames_selected"), "error");
                  }
                }}>
                {t("team_members_group_meeting")}
              </Button>
            )}
            <Button
              StartIcon="scroll-text"
              color="secondary"
              variant="button"
              size="sm"
              onClick={addMembersToEventTypes}>
              {t("add_members_to_event_types")}
            </Button>
            {canManageMembers && (
              <Button
                StartIcon="ban"
                color="destructive"
                variant="button"
                size="sm"
                onClick={() => {
                  const selectedMemberIds = Object.keys(selectedMembers);
                  const mToRemove = allMembers.filter((m) => selectedMemberIds.includes(m.id.toString()));
                  if (mToRemove.length === 0) {
                    triggerToast(t("no_members_selected"), "error");
                    return;
                  }
                  setMembersToRemove(mToRemove);
                  setShowBulkRemoveDialog(true);
                }}
                disabled={isRemoving}>
                {isRemoving ? t("removing") : t("remove_team_member")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Individual Member Removal Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("remove_team_member")}</DialogTitle>
            <DialogDescription>{t("remove_team_member_description")}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end space-x-3">
            <Button
              variant="button"
              color="minimal"
              onClick={() => setShowRemoveDialog(false)}
              disabled={isRemoving}>
              {t("cancel")}
            </Button>
            <Button
              variant="button"
              color="destructive"
              onClick={() => {
                if (memberToRemove) {
                  removeMember(memberToRemove.user.id);
                  setShowRemoveDialog(false);
                  setMemberToRemove(null);
                }
              }}
              disabled={isRemoving}>
              {t("remove_team_member")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Member Removal Confirmation Dialog */}
      <Dialog open={showBulkRemoveDialog} onOpenChange={setShowBulkRemoveDialog}>
        <DialogContent size="md" type="confirmation" title={t("remove_team_members")}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("remove_team_members")}</DialogTitle>
              <DialogDescription>{t("remove_team_members_description")}</DialogDescription>
            </DialogHeader>
            <div className="max-h-32 overflow-y-auto rounded-md border bg-gray-50 p-3">
              <p className="mb-2 text-xs font-medium text-gray-700">Members to be removed:</p>
              {membersToRemove.map((member) => (
                <div key={member.id} className="py-1 text-xs text-gray-600">
                  • {member.user.name || member.user.email}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              This action cannot be undone. All selected members will lose access to team resources.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <Button
                variant="button"
                color="minimal"
                onClick={() => setShowBulkRemoveDialog(false)}
                disabled={isRemoving}>
                {t("cancel")}
              </Button>
              <Button
                variant="button"
                color="destructive"
                onClick={() => {
                  membersToRemove.forEach((member) => {
                    removeMember(member.user.id);
                  });
                  setSelectedMembers({});
                  setShowBulkRemoveDialog(false);
                  setMembersToRemove([]);
                }}
                disabled={isRemoving}>
                {isRemoving ? t("removing") : t("remove_members")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Team Member Role Modal */}
      <EditTeamMemberRoleModal
        isOpen={showEditRoleModal}
        onClose={() => {
          setShowEditRoleModal(false);
          setMemberToEdit(null);
        }}
        member={memberToEdit}
        currentUserRole={team?.membership?.role || MembershipRole.MEMBER}
        onRoleUpdate={handleRoleUpdate}
        isUpdating={isUpdating}
      />

      {/* Impersonation Confirmation Dialog */}
      <Dialog open={showImpersonationDialog} onOpenChange={setShowImpersonationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("impersonate")}</DialogTitle>
            <DialogDescription>{t("impersonation_user_tip")}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end space-x-3">
            <DialogClose />
            <Button
              variant="button"
              onClick={async () => {
                if (memberToImpersonate) {
                  await signIn("impersonation-auth", {
                    username: memberToImpersonate.user.email,
                    teamId: team.id.toString(),
                  });
                  setShowImpersonationDialog(false);
                  setMemberToImpersonate(null);
                }
              }}>
              {t("impersonate")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Hook for managing member operations
export function useTeamMemberOperations(teamId: number) {
  const utils = trpc.useUtils();
  const { t } = useLocale();

  const removeMemberMutation = trpc.viewer.calidTeams.removeMember.useMutation({
    onSuccess: () => {
      utils.viewer.calidTeams.listMembers.invalidate();
      utils.viewer.calidTeams.get.invalidate();
      triggerToast(t("team_settings_updated_successfully"), "success");
    },
    onError: (error) => {
      triggerToast(error.message, "error");
    },
  });

  const changeMemberRoleMutation = trpc.viewer.calidTeams.changeMemberRole.useMutation({
    onSuccess: () => {
      utils.viewer.calidTeams.listMembers.invalidate();
      triggerToast(t("team_settings_updated_successfully"), "success");
    },
    onError: (error) => {
      triggerToast(error.message, "error");
    },
  });

  const resendInviteMutation = trpc.viewer.calidTeams.resendInvitation.useMutation({
    onSuccess: () => {
      triggerToast(t("invitation_resent"), "success");
      utils.viewer.calidTeams.listMembers.invalidate();
    },
    onError: (error) => {
      triggerToast(error.message, "error");
    },
  });

  const removeMember = useCallback(
    (memberId: number) => {
      removeMemberMutation.mutate({
        teamIds: [teamId],
        memberIds: [memberId], // assumes `member.id` is the membership id
      });
    },
    [teamId, removeMemberMutation]
  );

  const updateMemberRole = useCallback(
    (memberId: number, role: MembershipRole) => {
      changeMemberRoleMutation.mutate({
        teamId,
        memberId,
        role,
      });
    },
    [teamId, changeMemberRoleMutation]
  );

  return {
    removeMember,
    updateMemberRole,
    isRemoving: removeMemberMutation.isPending,
    isUpdating: changeMemberRoleMutation.isPending,
    resendInviteMutation,
  };
}

export default TeamMembersList;
