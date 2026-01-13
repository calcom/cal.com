"use client";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  ConfirmationDialogContent,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@calcom/ui/components/dialog";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { DropdownActions, Table } from "@calcom/ui/components/table";
import { showToast } from "@calcom/ui/components/toast";
import { keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { withLicenseRequired } from "~/ee/common/components/LicenseRequired";

const { Body, Cell, ColumnTitle, Header, Row } = Table;

const FETCH_LIMIT = 25;

function UsersTableBare() {
  const { t } = useLocale();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const router = useRouter();

  const mutation = trpc.viewer.users.delete.useMutation({
    onSuccess: async () => {
      showToast("User has been deleted", "success");
      // Lets not invalidate the whole cache, just remove the user from the cache.
      // Useful cause in prod this will be fetching 100k+ users
      // FIXME: Tested locally and it doesn't work, need to investigate
      utils.viewer.admin.listPaginated.setInfiniteData({ limit: FETCH_LIMIT }, (cachedData) => {
        if (!cachedData) {
          return {
            pages: [],
            pageParams: [],
          };
        }
        return {
          ...cachedData,
          pages: cachedData.pages.map((page) => ({
            ...page,
            rows: page.rows.filter((row) => row.id !== userToDelete),
          })),
        };
      });
    },
    onError: (err) => {
      console.error(err.message);
      showToast("There has been an error deleting this user.", "error");
    },
    onSettled: () => {
      setUserToDelete(null);
    },
  });

  const { data, fetchNextPage, isFetching } = trpc.viewer.admin.listPaginated.useInfiniteQuery(
    {
      limit: FETCH_LIMIT,
      searchTerm: debouncedSearchTerm,
    },
    {
      enabled: debouncedSearchTerm.length >= 2,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: false,
    }
  );

  const sendPasswordResetEmail = trpc.viewer.admin.sendPasswordReset.useMutation({
    onSuccess: () => {
      showToast("Password reset email has been sent", "success");
    },
  });

  const removeTwoFactor = trpc.viewer.admin.removeTwoFactor.useMutation({
    onSuccess: () => {
      showToast("2FA has been removed", "success");
    },
  });

  const lockUserAccount = trpc.viewer.admin.lockUserAccount.useMutation({
    onSuccess: ({ userId, locked }) => {
      showToast(locked ? "User was locked" : "User was unlocked", "success");
      utils.viewer.admin.listPaginated.setInfiniteData({ limit: FETCH_LIMIT }, (cachedData) => {
        if (!cachedData) {
          return {
            pages: [],
            pageParams: [],
          };
        }
        return {
          ...cachedData,
          pages: cachedData.pages.map((page) => ({
            ...page,
            rows: page.rows.map((row) => {
              const newUser = row;
              if (row.id === userId) newUser.locked = locked;
              return newUser;
            }),
          })),
        };
      });
      utils.viewer.admin.listPaginated.invalidate();
    },
  });

  const verifyWorkflows = trpc.viewer.admin.verifyWorkflows.useMutation({
    onSuccess: () => {
      showToast("Workflows verified", "success");
      utils.viewer.admin.listPaginated.invalidate();
    },
  });
  const whitelistUserWorkflows = trpc.viewer.admin.whitelistUserWorkflows.useMutation({
    onSuccess: (data) => {
      showToast(
        data.whitelistWorkflows ? t("user_workflows_whitelisted") : t("user_workflows_unwhitelisted"),
        "success"
      );
      utils.viewer.admin.listPaginated.invalidate();
    },
  });

  const handleImpersonateUser = async (email: string | null) => {
    await signIn("impersonation-auth", { username: email, callbackUrl: `${WEBAPP_URL}/event-types` });
  };

  //we must flatten the array of arrays from the useInfiniteQuery hook
  const flatData = useMemo(() => data?.pages?.flatMap((page) => page.rows) ?? [], [data]);
  const totalRowCount = data?.pages?.[0]?.meta?.totalRowCount ?? 0;
  const totalFetched = flatData.length;

  //called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 300px of the bottom of the table, fetch more data if there is any
        if (scrollHeight - scrollTop - clientHeight < 300 && !isFetching && totalFetched < totalRowCount) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, totalFetched, totalRowCount]
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  const hasSearched = debouncedSearchTerm.length >= 2;
  const showEmptyState = !hasSearched;
  const showNoResults = hasSearched && flatData.length === 0 && !isFetching;
  const showResults = hasSearched && flatData.length > 0;

  return (
    <div>
      <TextField
        placeholder={t("search_users_placeholder")}
        label={t("search")}
        addOnLeading={<Icon name="search" className="text-subtle h-4 w-4" />}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md"
      />

      {showEmptyState && (
        <div className="bg-muted border-muted mt-5 rounded-xl border p-1">
          <div className="bg-default border-muted flex flex-col items-center justify-center rounded-[10px] border px-5 py-16">
            <Icon name="search" className="text-subtle mb-4 h-12 w-12" />
            <h3 className="text-emphasis text-lg font-semibold">{t("search_users")}</h3>
            <p className="text-subtle mt-2 text-sm">{t("search_users_description")}</p>
          </div>
        </div>
      )}

      {showNoResults && (
        <div className="bg-muted border-muted mt-5 rounded-xl border p-1">
          <div className="bg-default border-muted flex flex-col items-center justify-center rounded-[10px] border px-5 py-16">
            <Icon name="user-x" className="text-subtle mb-4 h-12 w-12" />
            <h3 className="text-emphasis text-lg font-semibold">{t("no_results")}</h3>
            <p className="text-subtle mt-2 text-sm">
              {t("no_users_found_for_search", { searchTerm: debouncedSearchTerm })}
            </p>
          </div>
        </div>
      )}

      {showResults && (
        <div className="bg-muted border-muted mt-5 rounded-xl border p-1">
          <div
            className="bg-default border-muted rounded-[10px] border"
            ref={tableContainerRef}
            onScroll={() => fetchMoreOnBottomReached()}
            style={{
              height: "calc(100vh - 30vh)",
              overflow: "auto",
            }}>
            <Table>
              <Header>
                <ColumnTitle widthClassNames="w-auto">User</ColumnTitle>
                <ColumnTitle>Timezone</ColumnTitle>
                <ColumnTitle>Role</ColumnTitle>
                <ColumnTitle widthClassNames="w-auto">
                  <span className="sr-only">Edit</span>
                </ColumnTitle>
              </Header>

              <Body>
                {flatData.map((user) => (
                  <Row key={user.email}>
                    <Cell widthClassNames="w-auto">
                      <div className="min-h-10 flex ">
                        <Avatar
                          size="md"
                          alt={`Avatar of ${user.username || "Nameless"}`}
                          // @ts-expect-error - Figure it out later. Ideally we should show all the profiles here for the user.
                          imageSrc={`${WEBAPP_URL}/${user.username}/avatar.png?orgId=${user.organizationId}`}
                        />

                        <div className="text-subtle ml-4 font-medium">
                          <div className="flex gap-3">
                            <span className="text-default">{user.name}</span>
                            <span>/{user.username}</span>
                            {user.profiles[0]?.username && (
                              <span className="flex items-center gap-1">
                                <Icon name="building" className="text-subtle size-5" />
                                <span>{user.profiles[0]?.username}</span>
                              </span>
                            )}
                            {user.locked && <Icon name="lock" />}
                            <br />
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
                              onClick: () => sendPasswordResetEmail.mutate({ userId: user.id }),
                              icon: "lock",
                            },
                            {
                              id: "lock-user",
                              label: user.locked ? "Unlock User Account" : "Lock User Account",
                              onClick: () =>
                                lockUserAccount.mutate({ userId: user.id, locked: !user.locked }),
                              icon: "lock",
                            },
                            {
                              id: "verify-workflows",
                              label: "Verify workflows",
                              onClick: () => verifyWorkflows.mutate({ userId: user.id }),
                              icon: "check",
                            },
                            {
                              id: "whitelist-user-workflows",
                              label: user.whitelistWorkflows
                                ? t("remove_whitelist_status")
                                : t("whitelist_user_workflows"),
                              onClick: () => {
                                whitelistUserWorkflows.mutate({
                                  userId: user.id,
                                  whitelistWorkflows: !user.whitelistWorkflows,
                                });
                              },
                              icon: "check",
                            },
                            {
                              id: "impersonation",
                              label: "Impersonate",
                              onClick: () => {
                                setSelectedUser(user.email);
                                setShowImpersonateModal(true);
                              },
                              icon: "venetian-mask",
                            },
                            {
                              id: "remove-2fa",
                              label: "Remove 2FA",
                              color: "destructive",
                              onClick: () => removeTwoFactor.mutate({ userId: user.id }),
                              icon: "shield",
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
              </Body>
            </Table>
          </div>
        </div>
      )}

      <DeleteUserDialog
        user={userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => {
          if (!userToDelete) return;
          mutation.mutate({ userId: userToDelete });
        }}
      />

      {showImpersonateModal && selectedUser && (
        <Dialog open={showImpersonateModal} onOpenChange={() => setShowImpersonateModal(false)}>
          <DialogContent type="creation" title={t("impersonate")} description={t("impersonation_user_tip")}>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await signIn("impersonation-auth", { redirect: false, username: selectedUser });
                setShowImpersonateModal(false);
                router.replace("/settings/my-account/profile");
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
}

const DeleteUserDialog = ({
  user,
  onConfirm,
  onClose,
}: {
  user: number | null;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  return (
    <Dialog name="delete-user" open={!!user} onOpenChange={(open) => (open ? () => {} : onClose())}>
      <ConfirmationDialogContent
        title="Delete User"
        confirmBtnText="Delete"
        cancelBtnText="Cancel"
        variety="danger"
        onConfirm={onConfirm}>
        <p>Are you sure you want to delete this user?</p>
      </ConfirmationDialogContent>
    </Dialog>
  );
};

export const UsersTable = withLicenseRequired(UsersTableBare);
