"use client";

import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Checkbox, TextField } from "@calcom/ui/components/form";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@calcom/ui/components/sheet";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { useEffect, useState } from "react";

type Flag = RouterOutputs["viewer"]["features"]["list"][number];

interface AssignFeatureSheetProps {
  flag: Flag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignFeatureSheet({ flag, open, onOpenChange }: AssignFeatureSheetProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    trpc.viewer.admin.getTeamsForFeature.useInfiniteQuery(
      {
        featureId: flag.slug,
        limit: 20,
        searchTerm: debouncedSearchTerm || undefined,
      },
      {
        enabled: open,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const teams = data?.pages.flatMap((page) => page.teams) ?? [];

  useEffect(() => {
    if (!open) {
      setSearchTerm("");
    }
  }, [open]);

  const assignMutation = trpc.viewer.admin.assignFeatureToTeam.useMutation({
    onSuccess: () => {
      utils.viewer.admin.getTeamsForFeature.invalidate({ featureId: flag.slug });
      showToast(t("feature_assigned_successfully"), "success");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const unassignMutation = trpc.viewer.admin.unassignFeatureFromTeam.useMutation({
    onSuccess: () => {
      utils.viewer.admin.getTeamsForFeature.invalidate({ featureId: flag.slug });
      showToast(t("feature_unassigned_successfully"), "success");
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const handleToggleTeam = (teamId: number, currentlyHasFeature: boolean) => {
    if (currentlyHasFeature) {
      unassignMutation.mutate({
        teamId,
        featureId: flag.slug,
      });
    } else {
      assignMutation.mutate({
        teamId,
        featureId: flag.slug,
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const isLoading = assignMutation.isPending || unassignMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="bg-cal-muted">
        <SheetHeader>
          <SheetTitle>Assign: {flag.slug}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <div className="mb-4">
            <TextField
              type="text"
              placeholder={t("search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isPending ? (
            <SkeletonContainer>
              <div className="stack-y-3">
                {[...Array(5)].map((_, i) => (
                  <SkeletonText key={i} className="h-16 w-full" />
                ))}
              </div>
            </SkeletonContainer>
          ) : teams && teams.length > 0 ? (
            <>
              <div className="stack-y-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => handleToggleTeam(team.id, team.hasFeature)}
                    disabled={isLoading}
                    className="bg-default border-subtle hover:bg-cal-muted flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {team.isOrganization ? (
                          <div className="h-8 w-8 overflow-hidden rounded">
                            {team.logoUrl ? (
                              <img
                                src={team.logoUrl}
                                alt={team.name || ""}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="bg-emphasis text-default flex h-full w-full items-center justify-center text-xs font-semibold">
                                {team.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Avatar size="sm" alt={team.name || ""} imageSrc={team.logoUrl} />
                        )}
                        {team.parent && team.parentId && (
                          <div className="border-emphasis absolute -bottom-1 -right-1 h-4 w-4 overflow-hidden rounded border">
                            {team.parent.logoUrl ? (
                              <img
                                src={team.parent.logoUrl}
                                alt={team.parent.name || ""}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="bg-emphasis text-default flex h-full w-full items-center justify-center text-[8px] font-semibold">
                                {team.parent.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-emphasis text-sm font-medium">{team.name}</p>
                        {team.slug && <p className="text-subtle text-xs">{team.slug}</p>}
                        {team.parent && (
                          <p className="text-subtle text-xs">
                            {t("organization")}: {team.parent.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Checkbox checked={team.hasFeature} disabled={isLoading} onCheckedChange={() => {}} />
                  </button>
                ))}
              </div>
              {hasNextPage && (
                <div className="mt-4 flex justify-center">
                  <Button
                    color="secondary"
                    onClick={() => fetchNextPage()}
                    loading={isFetchingNextPage}
                    disabled={isFetchingNextPage}>
                    {t("load_more")}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-subtle text-center text-sm">{t("no_teams_found")}</p>
          )}
        </SheetBody>
        <SheetFooter>
          <Button color="secondary" onClick={handleClose}>
            {t("close")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
