import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Card, CardFrame, CardFrameFooter, CardPanel } from "@coss/ui/components/card";
import { Skeleton } from "@coss/ui/components/skeleton";
import type { ReactElement } from "react";

export type TeamProfilePageSkeletonProps = {
  variant?: "admin" | "member";
  showLogoRow?: boolean;
  showDangerZoneSubtitle?: boolean;
};

export function teamProfileSkeletonPropsFromList(
  teamId: number,
  teamsList: RouterOutputs["viewer"]["teams"]["list"] | undefined
): TeamProfilePageSkeletonProps {
  const row = teamsList?.find((t) => t.id === teamId);
  if (!row) {
    return {
      variant: "admin",
      showLogoRow: true,
      showDangerZoneSubtitle: true,
    };
  }
  const isAdmin = checkAdminOrOwner(row.role);
  return {
    variant: isAdmin ? "admin" : "member",
    showLogoRow: isAdmin && !row.parentId,
    showDangerZoneSubtitle: row.role === "OWNER",
  };
}

export function TeamProfilePageSkeleton({
  variant = "admin",
  showLogoRow = true,
  showDangerZoneSubtitle = true,
}: TeamProfilePageSkeletonProps): ReactElement {
  if (variant === "member") {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardPanel>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex min-w-0 grow flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-full max-w-sm" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-14 w-full" />
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-stretch">
                <Skeleton className="h-8 w-full rounded-lg sm:h-7 sm:min-w-[7.5rem]" />
                <Skeleton className="h-8 w-full rounded-lg sm:h-7 sm:min-w-[7.5rem]" />
              </div>
            </div>
          </CardPanel>
        </Card>

        <CardFrame>
          <Card>
            <CardPanel>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-5 w-36" />
                {showDangerZoneSubtitle ? (
                  <Skeleton className="h-4 w-full max-w-md" />
                ) : (
                  <div className="min-h-0" aria-hidden />
                )}
              </div>
            </CardPanel>
          </Card>
          <CardFrameFooter className="flex justify-end">
            <Skeleton className="h-9 w-40 rounded-lg sm:h-8" />
          </CardFrameFooter>
        </CardFrame>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <Card>
          <CardPanel>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {showLogoRow ? (
                <div className="flex items-center gap-4 max-md:col-span-2">
                  <Skeleton className="size-16 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-col gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32 rounded-lg sm:h-7" />
                  </div>
                </div>
              ) : null}

              <div className="col-span-full flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="col-span-full flex flex-col gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="col-span-full flex flex-col gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="col-span-full flex flex-col gap-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-4 w-full max-w-lg" />
              </div>
            </div>
          </CardPanel>
        </Card>
        <CardFrameFooter className="flex justify-end gap-2">
          <Skeleton className="h-9 w-24 rounded-lg sm:h-8" />
        </CardFrameFooter>
      </CardFrame>

      <CardFrame>
        <Card>
          <CardPanel>
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-36" />
              {showDangerZoneSubtitle ? (
                <Skeleton className="h-4 w-full max-w-md" />
              ) : (
                <div className="min-h-0" aria-hidden />
              )}
            </div>
          </CardPanel>
        </Card>
        <CardFrameFooter className="flex justify-end">
          <Skeleton className="h-9 w-40 rounded-lg sm:h-8" />
        </CardFrameFooter>
      </CardFrame>
    </div>
  );
}
