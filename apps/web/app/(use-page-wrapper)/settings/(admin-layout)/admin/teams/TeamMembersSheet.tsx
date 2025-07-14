"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import {
  DataTableProvider,
  DataTableWrapper,
  DataTableToolbar,
  useDataTable,
} from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { Input, ToggleGroup } from "@calcom/ui/components/form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";

type TeamMember = {
  id: number;
  userId: number;
  teamId: number;
  role: MembershipRole;
  accepted: boolean;
  disableImpersonation: boolean;
  createdAt: Date | null;
  user: {
    id: number;
    name: string | null;
    email: string;
    username: string | null;
    avatarUrl: string | null;
    locked: boolean;
    role: string;
  };
  team: {
    id: number;
    name: string;
    isOrganization: boolean;
  };
};

type TeamWithFeatures = {
  id: number;
  name: string;
  slug: string | null;
  parentId: number | null;
  isOrganization: boolean;
  platformBilling: { id: number } | null;
  children: { id: number; name: string }[];
};

interface TeamMembersSheetProps {
  team: TeamWithFeatures;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamMembersSheet({ team, open, onOpenChange }: TeamMembersSheetProps) {
  return (
    <div className="hidden md:block">
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent fullscreen>
          <SheetHeader>
            <SheetTitle>{team.name} - Team Members</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex-1">
            <DataTableProvider defaultPageSize={25}>
              <TeamMembersContent team={team} />
            </DataTableProvider>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TeamMembersContent({ team }: { team: TeamWithFeatures }) {
  const { t } = useLocale();
  const { limit, offset, searchTerm } = useDataTable();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");

  const utils = trpc.useUtils();
  const { data, isPending } = trpc.viewer.admin.teamMembers.listMembers.useQuery(
    {
      teamId: team.id,
      limit,
      offset,
      searchTerm,
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  const changeMemberRoleMutation = trpc.viewer.admin.teamMembers.changeMemberRole.useMutation({
    onSuccess: () => {
      showToast(t("member_role_updated_successfully"), "success");
      utils.viewer.admin.teamMembers.listMembers.invalidate();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const deleteMemberMutation = trpc.viewer.admin.teamMembers.deleteMember.useMutation({
    onSuccess: (data) => {
      showToast(data.message, "success");
      utils.viewer.admin.teamMembers.listMembers.invalidate();
      setDeleteConfirmOpen(false);
      setMemberToDelete(null);
      setConfirmEmail("");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleRoleChange = async (membershipId: number, role: MembershipRole) => {
    try {
      await changeMemberRoleMutation.mutateAsync({ membershipId, role });
    } catch (error) {
      console.error("Error updating member role:", error);
    }
  };

  const handleDeleteMember = (member: TeamMember) => {
    setMemberToDelete(member);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;

    try {
      await deleteMemberMutation.mutateAsync({ membershipId: memberToDelete.id });
    } catch (error) {
      console.error("Error deleting member:", error);
    }
  };

  const handleDeleteModalClose = () => {
    setDeleteConfirmOpen(false);
    setMemberToDelete(null);
    setConfirmEmail("");
  };

  const columns = useMemo<ColumnDef<TeamMember>[]>(
    () => [
      {
        id: "user",
        header: t("user"),
        cell: ({ row }) => (
          <div className="flex items-center space-x-3">
            <Avatar
              alt={row.original.user.name || row.original.user.email}
              imageSrc={row.original.user.avatarUrl}
              size="sm"
            />
            <div>
              <div className="font-medium">{row.original.user.name || row.original.user.email}</div>
              <div className="text-sm text-gray-500">{row.original.user.email}</div>
              {row.original.user.username && (
                <div className="text-xs text-gray-400">@{row.original.user.username}</div>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "status",
        header: t("status"),
        cell: ({ row }) => (
          <div className="flex flex-col space-y-1">
            <Badge variant={row.original.accepted ? "green" : "yellow"}>
              {row.original.accepted ? t("accepted") : t("pending")}
            </Badge>
            {row.original.user.locked && <Badge variant="red">{t("locked")}</Badge>}
          </div>
        ),
      },
      {
        id: "role",
        header: t("role"),
        cell: ({ row }) => (
          <ToggleGroup
            value={row.original.role}
            onValueChange={(value) => {
              if (value && value !== row.original.role) {
                handleRoleChange(row.original.id, value as MembershipRole);
              }
            }}
            options={[
              { value: MembershipRole.MEMBER, label: t("member") },
              { value: MembershipRole.ADMIN, label: t("admin") },
              { value: MembershipRole.OWNER, label: t("owner") },
            ]}
          />
        ),
      },
      {
        id: "joinedAt",
        header: t("joined_at"),
        cell: ({ row }) => (
          <div className="text-sm text-gray-500">
            {row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : "-"}
          </div>
        ),
      },
      {
        id: "actions",
        header: t("actions"),
        cell: ({ row }) => (
          <div className="flex space-x-2">
            <Button
              variant="icon"
              StartIcon="trash"
              color="destructive"
              onClick={() => handleDeleteMember(row.original)}
              disabled={deleteMemberMutation.isPending}
            />
          </div>
        ),
      },
    ],
    [t, changeMemberRoleMutation.isPending, deleteMemberMutation.isPending]
  );

  const table = useReactTable({
    data: data?.members ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  return (
    <>
      <DataTableWrapper
        table={table}
        isPending={isPending}
        totalRowCount={data?.totalCount}
        paginationMode="standard"
        ToolbarLeft={<DataTableToolbar.SearchBar placeholder={t("search_members")} />}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent
          title={t("confirm_delete_member_title")}
          description={t("confirm_delete_member_description", {
            name: memberToDelete?.user.name || memberToDelete?.user.email,
            team: team.name,
          })}
          type="confirmation"
          Icon="trash">
          <div className="mb-4 space-y-6">
            <div>
              <label htmlFor="confirm-email" className="block text-sm font-medium text-gray-700">
                {t("type_email_to_confirm")}
              </label>
              <Input
                id="confirm-email"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={memberToDelete?.user.email}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleDeleteModalClose}>
                {t("cancel")}
              </Button>
              <Button
                color="destructive"
                onClick={confirmDeleteMember}
                disabled={confirmEmail !== memberToDelete?.user.email || deleteMemberMutation.isPending}
                loading={deleteMemberMutation.isPending}>
                {t("delete")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
