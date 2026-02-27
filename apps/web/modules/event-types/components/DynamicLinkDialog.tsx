"use client";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { LearnMoreLink } from "@calcom/features/eventtypes/components/LearnMoreLink";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useInViewObserver } from "@calcom/lib/hooks/useInViewObserver";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Input, Label } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { CheckIcon, CopyIcon, ExternalLinkIcon, LoaderIcon } from "@coss/ui/icons";
import { useMemo, useRef, useState } from "react";

interface UserOption {
  id: number;
  name: string;
  username: string;
}

interface DynamicLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const MEMBERS_LIMIT = 20;

export function DynamicLinkDialog({ isOpen, onClose }: DynamicLinkDialogProps) {
  const { t } = useLocale();
  const orgBranding = useOrgBranding();
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const { copyToClipboard, isCopied } = useCopy();

  const baseUrl = orgBranding?.fullDomain ?? WEBSITE_URL;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    trpc.viewer.organizations.listMembersMinimal.useInfiniteQuery(
      {
        limit: MEMBERS_LIMIT,
        searchTerm: debouncedSearch,
      },
      {
        enabled: isOpen,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const allMembers = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data]);

  const { ref: observerRef } = useInViewObserver(() => {
    if (hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, scrollContainerRef.current);

  const selectedUserIds = useMemo(() => new Set(selectedUsers.map((u) => u.id)), [selectedUsers]);

  const toggleUserSelection = (user: UserOption) => {
    if (selectedUserIds.has(user.id)) {
      setSelectedUsers((prev) => prev.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers((prev) => [...prev, user]);
    }
  };

  const dynamicLink = useMemo(() => {
    if (selectedUsers.length < 2) return "";
    const usernames = selectedUsers.map((user) => user.username).join("+");
    return `${baseUrl}/${usernames}`;
  }, [selectedUsers, baseUrl]);

  // Renders the dynamic link with word break opportunities after each "+"
  const renderDynamicLink = () => {
    if (!dynamicLink) return null;
    const parts = dynamicLink.split("+");
    return parts.map((part, index) => (
      <span key={index}>
        <span className="whitespace-nowrap">
          {part}
          {index < parts.length - 1 && "+"}
        </span>
        {index < parts.length - 1 && <wbr />}
      </span>
    ));
  };

  const handleCopyLink = () => {
    if (dynamicLink) {
      copyToClipboard(dynamicLink);
      showToast(t("link_copied"), "success");
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setSearchTerm("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        title={t("dynamic_link")}
        description={
          <LearnMoreLink
            t={t}
            i18nKey="dynamic_link_description"
            href="https://cal.com/help/event-types/dynamic"
          />
        }
        enableOverflow>
        <div className="flex flex-col">
          <div>
            <Label className="text-emphasis">{t("select_users")}</Label>
            <div className="mt-2">
              <Input
                type="text"
                placeholder={t("search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="dynamic-link-user-search"
              />
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="scroll-bar mt-2 flex h-[200px] flex-col gap-0.5 overflow-y-scroll rounded-md border p-1">
            {isFetching && allMembers.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <LoaderIcon className="h-5 w-5 animate-spin text-subtle" />
                  <p className="text-sm text-subtle">{t("loading")}</p>
                </div>
              </div>
            ) : allMembers.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-subtle">{t("no_options_available")}</p>
              </div>
            ) : (
              <>
                {allMembers.map((user) => {
                  const isSelected = selectedUserIds.has(user.id);
                  return (
                    <label
                      key={user.id}
                      className={classNames(
                        "flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2 outline-none focus-within:bg-subtle hover:bg-subtle",
                        isSelected && "bg-subtle"
                      )}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-default"
                        checked={isSelected}
                        onChange={() => toggleUserSelection(user)}
                      />
                      <div className="flex flex-col">
                        <span className="text-emphasis text-sm">{user.name}</span>
                        <span className="text-subtle text-xs">@{user.username}</span>
                      </div>
                      {isSelected && (
                        <div className="ml-auto">
                          <CheckIcon className="h-4 w-4 text-emphasis" />
                        </div>
                      )}
                    </label>
                  );
                })}
                <div className="text-center text-default" ref={observerRef}>
                  <Button
                    color="minimal"
                    loading={isFetchingNextPage}
                    disabled={!hasNextPage}
                    onClick={() => fetchNextPage()}>
                    {hasNextPage ? t("load_more_results") : t("no_more_results")}
                  </Button>
                </div>
              </>
            )}
          </div>

          {selectedUsers.length >= 2 ? (
            <div className="mt-4">
              <Label className="text-emphasis">{t("dynamic_link")}</Label>
              <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted p-2">
                <a
                  href={dynamicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 text-emphasis text-sm hover:underline">
                  {renderDynamicLink()}
                </a>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="icon"
                    color="minimal"
                    CustomStartIcon={
                      isCopied ? (
                        <CheckIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )
                    }
                    onClick={handleCopyLink}
                    tooltip={t("copy_link")}
                  />
                  <Button
                    variant="icon"
                    color="minimal"
                    CustomStartIcon={<ExternalLinkIcon className="h-4 w-4" />}
                    onClick={() => window.open(dynamicLink, "_blank")}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-subtle">{t("select_at_least_two_users")}</p>
          )}
        </div>

        <DialogFooter>
          <DialogClose />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
