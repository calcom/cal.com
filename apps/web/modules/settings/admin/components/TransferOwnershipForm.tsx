"use client";

import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Frame, FramePanel } from "@coss/ui/components/frame";
import { Input } from "@coss/ui/components/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@coss/ui/components/input-group";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@coss/ui/components/select";
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@coss/ui/components/sheet";
import { AlertTriangleIcon, ArrowRightIcon, SearchIcon, UserIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type PreviousOwnerAction = "ADMIN" | "MEMBER" | "REMOVE";

type UserOption = { id: number; email: string; name: string | null };

function extractErrorMessage(error: { message: string; data?: unknown }): string {
  const data = error.data as
    | { zodError?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } }
    | undefined;
  if (data?.zodError) {
    const fieldMessages = Object.values(data.zodError.fieldErrors ?? {}).flat();
    const formMessages = data.zodError.formErrors ?? [];
    const allMessages = [...formMessages, ...fieldMessages];
    if (allMessages.length > 0) return allMessages.join(". ");
  }
  return error.message;
}

function UserAutocomplete({
  teamId,
  excludeUserIds,
  onSelect,
  selectedUser,
  onClear,
}: {
  teamId: number;
  excludeUserIds?: number[];
  onSelect: (user: UserOption) => void;
  selectedUser: UserOption | null;
  onClear: () => void;
}) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.viewer.admin.searchUsersByEmail.useInfiniteQuery(
      { teamId, query: debouncedQuery, limit: 10 },
      {
        enabled: debouncedQuery.length >= 3,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const allUsers = data?.pages.flatMap((page) => page.users) ?? [];
  const users = excludeUserIds?.length ? allUsers.filter((u) => !excludeUserIds.includes(u.id)) : allUsers;

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setShowDropdown(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  if (selectedUser) {
    return (
      <Field>
        <FieldLabel>{t("new_owner")}</FieldLabel>
        <div className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary">
              <UserIcon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="truncate text-sm font-medium">{selectedUser.name ?? selectedUser.email}</p>
              {selectedUser.name && (
                <p className="truncate text-xs text-muted-foreground">{selectedUser.email}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground">
            <XIcon className="size-3.5" />
          </button>
        </div>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel>{t("new_owner")}</FieldLabel>
      <div className="relative w-full" ref={dropdownRef}>
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            placeholder={t("search_users_by_email")}
            value={query}
            onChange={(e) => {
              setQuery((e.target as HTMLInputElement).value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
        </InputGroup>
        {showDropdown && query.length >= 3 && (
          <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border bg-popover shadow-lg">
            {users.length === 0 ? (
              <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                <SearchIcon className="size-3.5" />
                {t("no_results_found")}
              </div>
            ) : (
              <>
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-accent"
                    onClick={() => {
                      onSelect(user);
                      setShowDropdown(false);
                      setQuery("");
                    }}>
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <UserIcon className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm">{user.name ?? user.email}</div>
                      {user.name && (
                        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                      )}
                    </div>
                  </button>
                ))}
                {hasNextPage && (
                  <button
                    type="button"
                    className="w-full border-t px-3 py-2 text-center text-xs text-muted-foreground transition-colors hover:bg-accent"
                    disabled={isFetchingNextPage}
                    onClick={() => fetchNextPage()}>
                    {isFetchingNextPage ? t("loading") : t("load_more")}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Field>
  );
}

function OwnershipPreview({
  previewData,
  t,
}: {
  previewData: {
    newOwner: { userId: number; email: string; name: string | null };
    previousOwner: { userId: number; email: string; name: string | null; action: string };
    stripeEmailChange: { from: string; to: string };
  };
  t: (key: string) => string;
}) {
  const actionLabels: Record<string, string> = {
    ADMIN: t("demote_to_admin"),
    MEMBER: t("demote_to_member"),
    REMOVE: t("remove_from_team"),
  };

  const actionVariant: Record<string, "warning" | "error" | "secondary"> = {
    ADMIN: "warning",
    MEMBER: "warning",
    REMOVE: "error",
  };

  return (
    <Frame className="mt-3">
      <FramePanel className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <span className="text-xs text-muted-foreground">{t("previous_owner")}</span>
          <p className="truncate text-sm font-medium">
            {previewData.previousOwner.name ?? previewData.previousOwner.email}
          </p>
          {previewData.previousOwner.name && (
            <p className="truncate text-xs text-muted-foreground">{previewData.previousOwner.email}</p>
          )}
        </div>
        <Badge variant={actionVariant[previewData.previousOwner.action] ?? "warning"} className="shrink-0">
          {actionLabels[previewData.previousOwner.action]}
        </Badge>
      </FramePanel>

      <FramePanel className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <span className="text-xs text-muted-foreground">{t("new_owner")}</span>
          <p className="truncate text-sm font-medium">
            {previewData.newOwner.name ?? previewData.newOwner.email}
          </p>
          {previewData.newOwner.name && (
            <p className="truncate text-xs text-muted-foreground">{previewData.newOwner.email}</p>
          )}
        </div>
        <Badge variant="success" className="shrink-0">
          {t("promoted_to_owner")}
        </Badge>
      </FramePanel>

      <FramePanel className="p-3">
        <span className="text-xs text-muted-foreground">{t("billing_email")}</span>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="truncate font-mono text-xs text-destructive-foreground line-through">
            {previewData.stripeEmailChange.from || "(empty)"}
          </span>
          <ArrowRightIcon className="size-2.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-xs text-success-foreground">
            {previewData.stripeEmailChange.to}
          </span>
        </div>
      </FramePanel>
    </Frame>
  );
}

function RecreatePreview({
  previewData,
  t,
}: {
  previewData: {
    newOwner: { userId: number; email: string; name: string | null };
    dunningAction: string;
  };
  t: (key: string) => string;
}) {
  return (
    <Frame className="mt-3">
      <FramePanel className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <span className="text-xs text-muted-foreground">{t("new_owner")}</span>
          <p className="truncate text-sm font-medium">
            {previewData.newOwner.name ?? previewData.newOwner.email}
          </p>
          {previewData.newOwner.name && (
            <p className="truncate text-xs text-muted-foreground">{previewData.newOwner.email}</p>
          )}
        </div>
        <Badge variant="success" className="shrink-0">
          {t("promoted_to_owner")}
        </Badge>
      </FramePanel>

      <FramePanel className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <span className="text-xs text-muted-foreground">{t("status")}</span>
          <p className="text-sm font-medium">{t("subscription_will_be_cancelled")}</p>
        </div>
        <Badge variant="error" className="shrink-0">
          CANCELLED
        </Badge>
      </FramePanel>
    </Frame>
  );
}

export function TransferOwnershipForm({
  teamId,
  customerId,
  billingId,
  entityType,
  onComplete,
}: {
  teamId: number;
  customerId: string;
  billingId: string;
  entityType: "team" | "organization";
  onComplete: () => void;
}) {
  const { t } = useLocale();
  const [showForm, setShowForm] = useState(false);
  const [selectedPreviousOwner, setSelectedPreviousOwner] = useState<string>("");
  const [previousOwnerAction, setPreviousOwnerAction] = useState<string>("");
  const [selectedNewOwner, setSelectedNewOwner] = useState<UserOption | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const ownersQuery = trpc.viewer.admin.getTeamOwners.useQuery({ teamId }, { enabled: showForm });

  const hasNoOwners = ownersQuery.data?.owners.length === 0;
  const isRecreateMode = !!ownersQuery.data && hasNoOwners;

  useEffect(() => {
    if (ownersQuery.data?.owners.length === 1 && !selectedPreviousOwner) {
      setSelectedPreviousOwner(String(ownersQuery.data.owners[0].userId));
    }
  }, [ownersQuery.data, selectedPreviousOwner]);

  const previewMutation = trpc.viewer.admin.transferOwnership.useMutation();
  const recreatePreviewMutation = trpc.viewer.admin.recreateOwnership.useMutation();

  const activeMutation = isRecreateMode ? recreatePreviewMutation : previewMutation;

  const resetForm = () => {
    setShowForm(false);
    setShowConfirmDialog(false);
    setSelectedPreviousOwner("");
    setPreviousOwnerAction("");
    setSelectedNewOwner(null);
    previewMutation.reset();
    recreatePreviewMutation.reset();
  };

  const executeMutation = trpc.viewer.admin.transferOwnership.useMutation({
    onSuccess: () => {
      showToast(t("transfer_ownership_success"), "success");
      onComplete();
      resetForm();
    },
    onError: (err) => {
      setShowConfirmDialog(false);
      showToast(err.message, "error");
    },
  });

  const recreateExecuteMutation = trpc.viewer.admin.recreateOwnership.useMutation({
    onSuccess: () => {
      showToast(t("recreate_ownership_success"), "success");
      onComplete();
      resetForm();
    },
    onError: (err) => {
      setShowConfirmDialog(false);
      showToast(err.message, "error");
    },
  });

  const handlePreview = () => {
    if (isRecreateMode) {
      if (!selectedNewOwner) return;
      recreatePreviewMutation.mutate({
        teamId,
        newOwnerUserId: selectedNewOwner.id,
        billingId,
        entityType,
        mode: "preview",
      });
      return;
    }

    if (!selectedPreviousOwner || !previousOwnerAction || !selectedNewOwner) return;
    previewMutation.mutate({
      teamId,
      newOwnerUserId: selectedNewOwner.id,
      previousOwnerUserId: Number(selectedPreviousOwner),
      previousOwnerAction: previousOwnerAction as PreviousOwnerAction,
      customerId,
      mode: "preview",
    });
  };

  const handleExecute = () => {
    if (isRecreateMode) {
      if (!selectedNewOwner) return;
      recreateExecuteMutation.mutate({
        teamId,
        newOwnerUserId: selectedNewOwner.id,
        billingId,
        entityType,
        mode: "execute",
      });
      return;
    }

    if (!selectedPreviousOwner || !previousOwnerAction || !selectedNewOwner) return;
    executeMutation.mutate({
      teamId,
      newOwnerUserId: selectedNewOwner.id,
      previousOwnerUserId: Number(selectedPreviousOwner),
      previousOwnerAction: previousOwnerAction as PreviousOwnerAction,
      customerId,
      mode: "execute",
    });
  };

  const transferPreviewData = previewMutation.data?.mode === "preview" ? previewMutation.data : null;
  const recreatePreviewData =
    recreatePreviewMutation.data?.mode === "preview" ? recreatePreviewMutation.data : null;

  const hasPreview = isRecreateMode ? !!recreatePreviewData : !!transferPreviewData;
  const canPreview = isRecreateMode
    ? !!selectedNewOwner
    : !!selectedPreviousOwner && !!previousOwnerAction && !!selectedNewOwner;

  const sheetTitle = isRecreateMode ? t("recreate_ownership") : t("transfer_ownership");
  const sheetDescription = isRecreateMode
    ? t("recreate_ownership_description")
    : t("transfer_ownership_description");
  const confirmDescription = isRecreateMode
    ? t("recreate_ownership_confirm_description")
    : t("transfer_ownership_confirm_description");

  const activeExecuteMutation = isRecreateMode ? recreateExecuteMutation : executeMutation;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
        {t("transfer_ownership")}
      </Button>

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetPopup variant="inset">
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription>{sheetDescription}</SheetDescription>
          </SheetHeader>

          <SheetPanel>
            {isRecreateMode && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning bg-warning/10 p-3">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning" />
                <p className="text-sm text-warning">{t("no_owners_detected")}</p>
              </div>
            )}

            <div className="space-y-4">
              {!isRecreateMode && (
                <>
                  <Field>
                    <FieldLabel>{t("previous_owner")}</FieldLabel>
                    <Select
                      value={selectedPreviousOwner}
                      onValueChange={(value) => setSelectedPreviousOwner(value ?? "")}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("select_previous_owner")}>
                          {(() => {
                            const owner = ownersQuery.data?.owners.find(
                              (o) => String(o.userId) === selectedPreviousOwner
                            );
                            if (!owner) return null;
                            return owner.name ? `${owner.name} (${owner.email})` : owner.email;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectPopup>
                        {(ownersQuery.data?.owners ?? []).map((owner) => (
                          <SelectItem key={owner.userId} value={String(owner.userId)}>
                            {owner.name ? `${owner.name} (${owner.email})` : owner.email}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel>{t("previous_owner_action")}</FieldLabel>
                    <Select
                      value={previousOwnerAction}
                      onValueChange={(value) => setPreviousOwnerAction(value ?? "")}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("select_action_for_previous_owner")} />
                      </SelectTrigger>
                      <SelectPopup>
                        <SelectItem value="ADMIN">{t("demote_to_admin")}</SelectItem>
                        <SelectItem value="MEMBER">{t("demote_to_member")}</SelectItem>
                        <SelectItem value="REMOVE">{t("remove_from_team")}</SelectItem>
                      </SelectPopup>
                    </Select>
                  </Field>
                </>
              )}

              <UserAutocomplete
                teamId={teamId}
                excludeUserIds={selectedPreviousOwner ? [Number(selectedPreviousOwner)] : undefined}
                onSelect={setSelectedNewOwner}
                selectedUser={selectedNewOwner}
                onClear={() => setSelectedNewOwner(null)}
              />
            </div>

            {activeMutation.error && (
              <p className="mt-2 text-xs text-destructive-foreground">
                {extractErrorMessage(activeMutation.error)}
              </p>
            )}

            {transferPreviewData && <OwnershipPreview previewData={transferPreviewData} t={t} />}
            {recreatePreviewData && <RecreatePreview previewData={recreatePreviewData} t={t} />}
          </SheetPanel>

          <SheetFooter>
            <SheetClose render={<Button variant="outline" />}>{t("cancel")}</SheetClose>
            {!hasPreview ? (
              <Button disabled={!canPreview} onClick={handlePreview}>
                {t("preview_changes")}
              </Button>
            ) : (
              <Button onClick={() => setShowConfirmDialog(true)}>{t("confirm_transfer")}</Button>
            )}
          </SheetFooter>

          <Sheet open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <SheetPopup variant="inset">
              <SheetHeader>
                <SheetTitle>{t("confirm_transfer")}</SheetTitle>
                <SheetDescription>{confirmDescription}</SheetDescription>
              </SheetHeader>
              <SheetPanel>
                {transferPreviewData && <OwnershipPreview previewData={transferPreviewData} t={t} />}
                {recreatePreviewData && <RecreatePreview previewData={recreatePreviewData} t={t} />}
              </SheetPanel>
              <SheetFooter>
                <SheetClose render={<Button variant="outline" />}>{t("cancel")}</SheetClose>
                <Button disabled={activeExecuteMutation.isPending} onClick={handleExecute}>
                  {t("confirm_transfer")}
                </Button>
              </SheetFooter>
            </SheetPopup>
          </Sheet>
        </SheetPopup>
      </Sheet>
    </>
  );
}
