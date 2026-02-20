"use client";

import { Avatar } from "@calid/features/ui/components/avatar";
import { Button } from "@calid/features/ui/components/button";
import {
  Dialog as CalidDialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@calid/features/ui/components/dialog";
import { Icon } from "@calid/features/ui/components/icon";
import { TextField } from "@calid/features/ui/components/input/input";
import { triggerToast } from "@calid/features/ui/components/toast";
import { keepPreviousData } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Pagination } from "@calcom/ui/components/pagination";
import { DropdownActions, Table } from "@calcom/ui/components/table";

const { Cell, ColumnTitle, Header, Row } = Table;

const DEFAULT_PAGE_SIZE = 25;
const ROLE_FILTER_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "USER", label: "User" },
  { value: "ADMIN", label: "Admin" },
];
const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "UNLOCKED", label: "Unlocked" },
  { value: "LOCKED", label: "Locked" },
];

export const AdminUsersTable = () => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageIndex, setPageIndex] = useState(0);
  const [roleFilter, setRoleFilter] = useState<"ADMIN" | "USER" | null>(null);
  const [statusFilter, setStatusFilter] = useState<"LOCKED" | "UNLOCKED" | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "email" | "createdDate" | "role" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [userSortOpen, setUserSortOpen] = useState(false);
  const [roleFilterOpen, setRoleFilterOpen] = useState(false);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const userSortRef = useRef<HTMLDivElement | null>(null);
  const roleFilterRef = useRef<HTMLDivElement | null>(null);
  const statusFilterRef = useRef<HTMLDivElement | null>(null);

  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [impersonateUser, setImpersonateUser] = useState<string | null>(null);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const lastLockUserId = useRef<number | null>(null);

  const queryInput = useMemo(
    () => ({
      limit: pageSize,
      offset: pageIndex * pageSize,
      searchTerm: debouncedSearchTerm || null,
      role: roleFilter,
      locked: statusFilter === null ? null : statusFilter === "LOCKED",
      sortBy,
      sortDir: sortBy ? sortDir : null,
    }),
    [debouncedSearchTerm, pageIndex, pageSize, roleFilter, sortBy, sortDir, statusFilter]
  );

  const { data } = trpc.viewer.admin.calid.users.listPaginated.useQuery(queryInput, {
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const totalRowCount = data?.meta?.totalRowCount ?? 0;

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearchTerm, roleFilter, statusFilter, sortBy, sortDir]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userSortRef.current && userSortRef.current.contains(target)) return;
      if (roleFilterRef.current && roleFilterRef.current.contains(target)) return;
      if (statusFilterRef.current && statusFilterRef.current.contains(target)) return;
      setUserSortOpen(false);
      setRoleFilterOpen(false);
      setStatusFilterOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const deleteUser = trpc.viewer.admin.calid.users.delete.useMutation({
    onSuccess: async () => {
      triggerToast("User has been deleted", "success");
      utils.viewer.admin.calid.users.listPaginated.invalidate();
    },
    onError: () => {
      triggerToast("There has been an error deleting this user.", "error");
    },
    onSettled: () => setUserToDelete(null),
  });

  const sendPasswordReset = trpc.viewer.admin.sendPasswordReset.useMutation({
    onSuccess: () => triggerToast("Password reset email has been sent", "success"),
  });

  const lockUserAccount = trpc.viewer.admin.lockUserAccount.useMutation({
    onMutate: (input) => {
      lastLockUserId.current = input.userId;
    },
    onSuccess: ({ locked }) => {
      triggerToast(locked ? "User was locked" : "User was unlocked", "success");
      utils.viewer.admin.calid.users.listPaginated.setData(queryInput, (cachedData) => {
        if (!cachedData) return cachedData;
        const userId = lastLockUserId.current;
        if (!userId) return cachedData;
        return {
          ...cachedData,
          rows: cachedData.rows.map((row) => (row.id === userId ? { ...row, locked } : row)),
        };
      });
      utils.viewer.admin.calid.users.listPaginated.invalidate();
    },
  });

  const handleImpersonate = async (username: string) => {
    await signIn("impersonation-auth", { redirect: false, username });
    router.replace("/settings/my-account/profile");
  };

  const toggleSort = (column: "name" | "email" | "createdDate" | "role") => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir("asc");
  };

  const getSortIcon = (column: "name" | "email" | "createdDate" | "role") => {
    if (sortBy !== column) return "chevrons-up-down";
    return sortDir === "asc" ? "chevron-up" : "chevron-down";
  };

  const formatDateTime = (value?: Date | string | null) => {
    if (!value) return "—";
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return "—";
    const parts = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    const day = get("day");
    const month = get("month");
    const year = get("year");
    const hour = get("hour");
    const minute = get("minute");
    const dayPeriod = get("dayPeriod").toUpperCase();
    return `${day} ${month} ${year} ${hour}:${minute} ${dayPeriod}`.trim();
  };

  return (
    <div>
      <style jsx global>{`
        .admin-users-table thead th {
          position: sticky;
          top: 0;
          z-index: 1;
          background: var(--color-bg-default, #fff);
        }
        .admin-users-table > div {
          overflow: visible !important;
        }
        .admin-users-table thead tr {
          position: sticky;
          top: 0;
          z-index: 1;
          background: var(--color-bg-default, #fff);
        }
      `}</style>
      <TextField
        placeholder="Username or Email"
        label="Search"
        className="mb-3"
        onChange={(event) => setSearchTerm(event.target.value)}
      />
      <div className="admin-users-table border-subtle rounded-md border" style={{ overflow: "visible" }}>
        <Table>
          <Header>
            <ColumnTitle widthClassNames="w-auto">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-0">
                  <span className="bg-subtle/60 text-muted inline-flex w-fit rounded px-2 py-1 text-[11px] font-semibold uppercase">
                    User
                  </span>
                  <div className="relative" ref={userSortRef}>
                    <button
                      type="button"
                      className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded border text-[11px] ${
                        sortBy === "name" || sortBy === "email"
                          ? "text-default border-subtle"
                          : "text-subtle hover:text-default border-transparent"
                      }`}
                      onClick={() => {
                        setUserSortOpen((prev) => !prev);
                        setRoleFilterOpen(false);
                        setStatusFilterOpen(false);
                      }}>
                      <Icon name="chevron-down" className="h-3 w-3" />
                    </button>
                    {userSortOpen && (
                      <div className="bg-default border-subtle absolute left-0 z-20 mt-2 w-44 rounded-md border p-1 shadow-md">
                        <button
                          type="button"
                          className="text-default hover:bg-subtle flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs"
                          onClick={() => {
                            if (sortBy === "name" && sortDir === "asc") {
                              setSortBy(null);
                              setSortDir("asc");
                            } else {
                              setSortBy("name");
                              setSortDir("asc");
                            }
                            setUserSortOpen(false);
                          }}>
                          <span className="flex h-4 w-4 items-center justify-center">
                            {sortBy === "name" && sortDir === "asc" ? (
                              <Icon name="check" className="text-default h-3 w-3" />
                            ) : null}
                          </span>
                          <span>Name - A to Z</span>
                        </button>
                        <button
                          type="button"
                          className="text-default hover:bg-subtle flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs"
                          onClick={() => {
                            if (sortBy === "email" && sortDir === "asc") {
                              setSortBy(null);
                              setSortDir("asc");
                            } else {
                              setSortBy("email");
                              setSortDir("asc");
                            }
                            setUserSortOpen(false);
                          }}>
                          <span className="flex h-4 w-4 items-center justify-center">
                            {sortBy === "email" && sortDir === "asc" ? (
                              <Icon name="check" className="text-default h-3 w-3" />
                            ) : null}
                          </span>
                          <span>Email - A to Z</span>
                        </button>
                        <button
                          type="button"
                          className="text-default hover:bg-subtle flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs"
                          onClick={() => {
                            if (sortBy === "name" && sortDir === "desc") {
                              setSortBy(null);
                              setSortDir("asc");
                            } else {
                              setSortBy("name");
                              setSortDir("desc");
                            }
                            setUserSortOpen(false);
                          }}>
                          <span className="flex h-4 w-4 items-center justify-center">
                            {sortBy === "name" && sortDir === "desc" ? (
                              <Icon name="check" className="text-default h-3 w-3" />
                            ) : null}
                          </span>
                          <span>Name - Z to A</span>
                        </button>
                        <button
                          type="button"
                          className="text-default hover:bg-subtle flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs"
                          onClick={() => {
                            if (sortBy === "email" && sortDir === "desc") {
                              setSortBy(null);
                              setSortDir("asc");
                            } else {
                              setSortBy("email");
                              setSortDir("desc");
                            }
                            setUserSortOpen(false);
                          }}>
                          <span className="flex h-4 w-4 items-center justify-center">
                            {sortBy === "email" && sortDir === "desc" ? (
                              <Icon name="check" className="text-default h-3 w-3" />
                            ) : null}
                          </span>
                          <span>Email - Z to A</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ColumnTitle>
            <ColumnTitle>
              <span className="bg-subtle/60 text-muted inline-flex rounded px-2 py-1 text-[11px] font-semibold uppercase">
                Timezone
              </span>
            </ColumnTitle>
            <ColumnTitle>
              <div className="flex items-center gap-0">
                <span className="bg-subtle/60 text-muted inline-flex w-fit rounded px-2 py-1 text-[11px] font-semibold uppercase">
                  Role
                </span>
                <div className="relative" ref={roleFilterRef}>
                  <button
                    type="button"
                    className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded border text-[11px] ${
                      roleFilter
                        ? "text-default border-subtle"
                        : "text-subtle hover:text-default border-transparent"
                    }`}
                    onClick={() => {
                      setRoleFilterOpen((prev) => !prev);
                      setUserSortOpen(false);
                      setStatusFilterOpen(false);
                    }}>
                    <Icon name="chevron-down" className="h-3 w-3" />
                  </button>
                  {roleFilterOpen && (
                    <div className="bg-default border-subtle absolute left-0 z-20 mt-2 w-36 rounded-md border p-1 shadow-md">
                      {ROLE_FILTER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className="text-default hover:bg-subtle flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs"
                          onClick={() => {
                            const value = option.value ?? "ALL";
                            setRoleFilter(value === "ALL" ? null : (value as "ADMIN" | "USER"));
                            setRoleFilterOpen(false);
                          }}>
                          <span className="flex h-4 w-4 items-center justify-center">
                            {(option.value === "ALL" && roleFilter === null) ||
                            (option.value !== "ALL" && roleFilter === option.value) ? (
                              <Icon name="check" className="text-default h-3 w-3" />
                            ) : null}
                          </span>
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ColumnTitle>
            <ColumnTitle>
              <div className="flex items-center gap-0">
                <span className="bg-subtle/60 text-muted inline-flex w-fit rounded px-2 py-1 text-[11px] font-semibold uppercase">
                  Status
                </span>
                <div className="relative" ref={statusFilterRef}>
                  <button
                    type="button"
                    className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded border text-[11px] ${
                      statusFilter
                        ? "text-default border-subtle"
                        : "text-subtle hover:text-default border-transparent"
                    }`}
                    onClick={() => {
                      setStatusFilterOpen((prev) => !prev);
                      setUserSortOpen(false);
                      setRoleFilterOpen(false);
                    }}>
                    <Icon name="chevron-down" className="h-3 w-3" />
                  </button>
                  {statusFilterOpen && (
                    <div className="bg-default border-subtle absolute left-0 z-20 mt-2 w-40 rounded-md border p-1 shadow-md">
                      {STATUS_FILTER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className="text-default hover:bg-subtle flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs"
                          onClick={() => {
                            const value = option.value ?? "ALL";
                            setStatusFilter(value === "ALL" ? null : (value as "LOCKED" | "UNLOCKED"));
                            setStatusFilterOpen(false);
                          }}>
                          <span className="flex h-4 w-4 items-center justify-center">
                            {(option.value === "ALL" && statusFilter === null) ||
                            (option.value !== "ALL" && statusFilter === option.value) ? (
                              <Icon name="check" className="text-default h-3 w-3" />
                            ) : null}
                          </span>
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ColumnTitle>
            <ColumnTitle>
              <div className="flex items-center gap-0">
                <button
                  type="button"
                  className="bg-subtle/60 text-muted inline-flex items-center gap-0 rounded px-2 py-1 text-[11px] font-semibold uppercase"
                  onClick={() => toggleSort("createdDate")}>
                  Created
                </button>
                <button
                  type="button"
                  className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded border text-[11px] ${
                    sortBy === "createdDate"
                      ? "text-default border-subtle"
                      : "text-subtle hover:text-default border-transparent"
                  }`}
                  onClick={() => toggleSort("createdDate")}>
                  <Icon name={getSortIcon("createdDate")} className="h-3 w-3" />
                </button>
              </div>
            </ColumnTitle>
            <ColumnTitle>
              <span className="bg-subtle/60 text-muted inline-flex rounded px-2 py-1 text-[11px] font-semibold uppercase">
                Last active
              </span>
            </ColumnTitle>
            <ColumnTitle widthClassNames="w-auto">
              <span className="sr-only">Actions</span>
            </ColumnTitle>
          </Header>

          <tbody className="divide-subtle divide-y rounded-md">
            {rows.map((user) => (
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
                  <span
                    className={
                      user.role === "ADMIN"
                        ? "text-default rounded bg-red-100 px-2 py-1 text-xs font-semibold"
                        : "text-default rounded bg-gray-100 px-2 py-1 text-xs font-semibold"
                    }>
                    {user.role === "ADMIN" ? "Admin" : "User"}
                  </span>
                </Cell>
                <Cell>
                  <span
                    className={
                      user.locked
                        ? "text-default rounded bg-red-100 px-2 py-1 text-xs font-semibold"
                        : "text-default rounded bg-green-100 px-2 py-1 text-xs font-semibold"
                    }>
                    {user.locked ? "Locked" : "Unlocked"}
                  </span>
                </Cell>
                <Cell>{formatDateTime(user.createdDate)}</Cell>
                <Cell>{formatDateTime(user.lastActiveAt)}</Cell>
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
      <div className="mt-4">
        <Pagination
          currentPage={pageIndex + 1}
          pageSize={pageSize}
          totalItems={totalRowCount}
          onPageChange={(page) => setPageIndex(page - 1)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
        />
      </div>

      <CalidDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent size="md" showCloseButton>
          <DialogHeader showIcon variant="warning">
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>Are you sure you want to delete this user?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-8">
            <DialogClose color="secondary">{t("cancel")}</DialogClose>
            <Button
              color="primary"
              type="button"
              onClick={() => userToDelete && deleteUser.mutate({ userId: userToDelete })}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </CalidDialog>

      {showImpersonateModal && impersonateUser && (
        <CalidDialog open={showImpersonateModal} onOpenChange={setShowImpersonateModal}>
          <DialogContent size="md" showCloseButton>
            <DialogHeader>
              <DialogTitle>{t("impersonate")}</DialogTitle>
              <DialogDescription>{t("impersonation_user_tip")}</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                await handleImpersonate(impersonateUser);
                setShowImpersonateModal(false);
              }}>
              <DialogFooter className="mt-8">
                <DialogClose color="secondary">{t("cancel")}</DialogClose>
                <Button color="primary" type="submit">
                  {t("impersonate")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </CalidDialog>
      )}
    </div>
  );
};
