"use client";

import { useState, useEffect } from "react";

import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@coss/ui/components/avatar";
import { Button } from "@coss/ui/components/button";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import {
  Sheet,
  SheetClose,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@coss/ui/components/sheet";
import { Checkbox } from "@coss/ui/components/checkbox";
import { Skeleton } from "@coss/ui/components/skeleton";
import { toastManager } from "@coss/ui/components/toast";

type Flag = RouterOutputs["viewer"]["features"]["list"][number];

interface AssignFeatureSheetProps {
  flag: Flag | null;
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
        featureId: flag?.slug ?? "",
        limit: 20,
        searchTerm: debouncedSearchTerm || undefined,
      },
      {
        enabled: open && !!flag,
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
      if (flag) utils.viewer.admin.getTeamsForFeature.invalidate({ featureId: flag.slug });
      toastManager.add({ title: t("feature_assigned_successfully"), type: "success" });
    },
    onError: (err) => {
      toastManager.add({ title: err.message, type: "error" });
    },
  });

  const unassignMutation = trpc.viewer.admin.unassignFeatureFromTeam.useMutation({
    onSuccess: () => {
      if (flag) utils.viewer.admin.getTeamsForFeature.invalidate({ featureId: flag.slug });
      toastManager.add({ title: t("feature_unassigned_successfully"), type: "success" });
    },
    onError: (err) => {
      toastManager.add({ title: err.message, type: "error" });
    },
  });

  const handleToggleTeam = (teamId: number, currentlyHasFeature: boolean) => {
    if (!flag) return;
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

  const isLoading = assignMutation.isPending || unassignMutation.isPending;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetPopup variant="inset" showCloseButton={false}>
        <SheetHeader className="gap-3">
          <SheetTitle>Assign: {flag?.slug}</SheetTitle>
          <Input
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            placeholder={t("search")}
            value={searchTerm}
          />
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {isPending && !debouncedSearchTerm ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))
            ) : teams && teams.length > 0 ? (
              <>
                {teams.map((team) => {
                  const checkboxId = `assign-flag-team-${team.id}`;

                  return (
                    <Label
                      className="flex items-center justify-between gap-6 rounded-lg border p-3 hover:bg-accent/50 has-data-checked:border-primary/48 has-data-checked:bg-accent/50"
                      htmlFor={checkboxId}
                      key={team.id}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-8">
                          {team.logoUrl && (
                            <AvatarImage alt={team.name || ""} src={team.logoUrl} />
                          )}
                          <AvatarFallback>
                            {team.name?.charAt(0).toUpperCase() ?? ""}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <p className="truncate font-medium text-sm">{team.name}</p>
                          <p className="truncate text-muted-foreground text-xs">
                            {team.slug ?? (team.parent ? `${t("organization")}: ${team.parent.name}` : "")}
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        checked={team.hasFeature}
                        disabled={isLoading}
                        id={checkboxId}
                        onCheckedChange={(checked) =>
                          handleToggleTeam(team.id, checked !== true)
                        }
                      />
                    </Label>
                  );
                })}
                {hasNextPage && (
                  <Button
                    className="w-full"
                    disabled={isFetchingNextPage}
                    onClick={() => fetchNextPage()}
                    variant="outline">
                    {isFetchingNextPage ? t("loading") : t("load_more_results")}
                  </Button>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-center text-sm py-6">{t("no_teams_found", "No teams found")}</p>
            )}
          </div>
        </SheetPanel>
        <SheetFooter>
          <SheetClose render={<Button variant="ghost" />}>{t("close")}</SheetClose>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}
