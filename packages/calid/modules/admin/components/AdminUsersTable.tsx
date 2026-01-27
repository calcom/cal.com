"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  ConfirmationDialogContent,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@calcom/ui/components/dialog";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { DropdownActions, Table } from "@calcom/ui/components/table";
import { showToast } from "@calcom/ui/components/toast";

const { Cell, ColumnTitle, Header, Row } = Table;

const FETCH_LIMIT = 25;

export const AdminUsersTable = () => {
  const { t } = useLocale();
  const router = useRouter();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [impersonateUser, setImpersonateUser] = useState<string | null>(null);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const lastLockUserId = useRef<number | null>(null);

  const { data, fetchNextPage, isFetching } = trpc.viewer.admin.listPaginated.useInfiniteQuery(
    { limit: FETCH_LIMIT, searchTerm: debouncedSearchTerm },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: false,
    }
  );

  const flatRows = useMemo(() => data?.pages.flatMap((page) => page.rows) ?? [], [data]);
  const totalRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;

  const deleteUser = trpc.viewer.admin.calid.users.delete.useMutation({
    onSuccess: async () => {
      showToast("User has been deleted", "success");
      utils.viewer.admin.listPaginated.invalidate();
    },
    onError: () => {
      showToast("There has been an error deleting this user.", "error");
    },
    onSettled: () => setUserToDelete(null),
  });

  const sendPasswordReset = trpc.viewer.admin.sendPasswordReset.useMutation({
    onSuccess: () => showToast("Password reset email has been sent", "success"),
  });

  const lockUserAccount = trpc.viewer.admin.lockUserAccount.useMutation({
    onMutate: (input) => {
      lastLockUserId.current = input.userId;
    },
    onSuccess: ({ locked }) => {
      showToast(locked ? "User was locked" : "User was unlocked", "success");
      utils.viewer.admin.listPaginated.setInfiniteData(
        { limit: FETCH_LIMIT, searchTerm: debouncedSearchTerm },
        (cachedData) => {
          if (!cachedData) return cachedData;
          const userId = lastLockUserId.current;
          if (!userId) return cachedData;
          return {
            ...cachedData,
            pages: cachedData.pages.map((page) => ({
              ...page,
              rows: page.rows.map((row) => (row.id === userId ? { ...row, locked } : row)),
            })),
          };
        }
      );
      utils.viewer.admin.listPaginated.invalidate();
    },
  });

  const handleImpersonate = async (username: string) => {
    await signIn("impersonation-auth", { redirect: false, username });
    router.replace("/settings/my-account/profile");
  };

  const fetchMoreOnBottomReached = useCallback(
    (containerRef?: HTMLDivElement | null) => {
      if (!containerRef) return;
      const { scrollHeight, scrollTop, clientHeight } = containerRef;
      if (scrollHeight - scrollTop - clientHeight < 300 && !isFetching && flatRows.length < totalRowCount) {
        fetchNextPage();
      }
    },
    [fetchNextPage, flatRows.length, isFetching, totalRowCount]
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  return (
    <div>
      <TextField
        placeholder="username or email"
        label="Search"
        onChange={(event) => setSearchTerm(event.target.value)}
      />
      <div
        className="border-subtle rounded-md border"
        ref={tableContainerRef}
        onScroll={() => fetchMoreOnBottomReached(tableContainerRef.current)}
        style={{ height: "calc(100vh - 30vh)", overflow: "auto" }}>
        <Table>
          <Header>
            <ColumnTitle widthClassNames="w-auto">User</ColumnTitle>
            <ColumnTitle>Timezone</ColumnTitle>
            <ColumnTitle>Role</ColumnTitle>
            <ColumnTitle widthClassNames="w-auto">
              <span className="sr-only">Actions</span>
            </ColumnTitle>
          </Header>

          <tbody className="divide-subtle divide-y rounded-md">
            {flatRows.map((user) => (
              <Row key={user.email}>
                <Cell widthClassNames="w-auto">
                  <div className="flex min-h-10">
                    <Avatar
                      size="md"
                      alt={`Avatar of ${user.username || "Nameless"}`}
                      imageSrc={getUserAvatarUrl({
                        avatarUrl: user.avatarUrl || undefined,
                      })}
                    />
                    <div className="text-subtle ml-4 font-medium">
                      <div className="flex gap-3">
                        <span className="text-default">{user.name}</span>
                        <span>/{user.username}</span>
                        {user.profiles?.[0]?.username && (
                          <span className="flex items-center gap-1">
                            <Icon name="building" className="text-subtle size-5" />
                            <span>{user.profiles[0].username}</span>
                          </span>
                        )}
                        {user.locked && <Icon name="lock" />}
                      </div>
                      <span className="break-all">{user.email}</span>
                    </div>
                  </div>
                </Cell>
                <Cell>{user.timeZone}</Cell>
                <Cell>
                  <Badge className="capitalize" variant={user.role === "ADMIN" ? "red" : "gray"}>
                    {user.role.toLowerCase()}
                  </Badge>
                </Cell>
                <Cell widthClassNames="w-auto">
                  <div className="flex w-full justify-end">
                    <DropdownActions
                      actions={[
                        {
                          id: "edit",
                          label: "Edit",
                          href: `/settings/admin/users/${user.id}/edit`,
                          icon: "pencil",
                        },
                        {
                          id: "reset-password",
                          label: "Reset Password",
                          onClick: () => sendPasswordReset.mutate({ userId: user.id }),
                          icon: "lock",
                        },
                        {
                          id: "impersonate",
                          label: "Impersonate",
                          onClick: () => {
                            setImpersonateUser(user.username);
                            setShowImpersonateModal(true);
                          },
                          icon: "venetian-mask",
                        },
                        {
                          id: "lock-user",
                          label: user.locked ? "Unlock User Account" : "Lock User Account",
                          onClick: () => lockUserAccount.mutate({ userId: user.id, locked: !user.locked }),
                          icon: "lock",
                        },
                        {
                          id: "delete",
                          label: "Delete",
                          color: "destructive",
                          onClick: () => setUserToDelete(user.id),
                          icon: "trash",
                        },
                      ]}
                    />
                  </div>
                </Cell>
              </Row>
            ))}
          </tbody>
        </Table>
      </div>

      <Dialog
        name="delete-user"
        open={!!userToDelete}
        onOpenChange={(open) => {
          if (!open) setUserToDelete(null);
        }}>
        <ConfirmationDialogContent
          title="Delete User"
          confirmBtnText="Delete"
          cancelBtnText="Cancel"
          variety="danger"
          onConfirm={() => userToDelete && deleteUser.mutate({ userId: userToDelete })}>
          <p>Are you sure you want to delete this user?</p>
        </ConfirmationDialogContent>
      </Dialog>

      {showImpersonateModal && impersonateUser && (
        <Dialog open={showImpersonateModal} onOpenChange={() => setShowImpersonateModal(false)}>
          <DialogContent type="creation" title={t("impersonate")} description={t("impersonation_user_tip")}>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                await handleImpersonate(impersonateUser);
                setShowImpersonateModal(false);
              }}>
              <DialogFooter showDivider className="mt-8">
                <DialogClose color="secondary">{t("cancel")}</DialogClose>
                <Button color="primary" type="submit">
                  {t("impersonate")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
