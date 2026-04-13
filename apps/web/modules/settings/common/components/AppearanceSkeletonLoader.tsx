import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Skeleton } from "@coss/ui/components/skeleton";
import type { ReactElement } from "react";

export const AppearanceSkeletonLoader = (): ReactElement => {
  return (
    <div className="flex flex-col gap-4">
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>
            <Skeleton className="my-0.5 h-4 w-40" data-testid="skeleton-text" />
          </CardFrameTitle>
          <CardFrameDescription>
            <Skeleton className="my-0.5 h-4 w-64" data-testid="skeleton-text" />
          </CardFrameDescription>
        </CardFrameHeader>
        <Card>
          <CardPanel>
            <div className="flex w-full flex-col gap-4 sm:flex-row md:gap-6">
              <div className="flex flex-1 items-center gap-4 sm:flex-col">
                <Skeleton
                  className="aspect-208/120 w-full rounded-sm max-sm:w-20 sm:rounded-lg"
                  data-testid="skeleton-text"
                />
                <Skeleton className="h-4 w-full max-w-56" data-testid="skeleton-text" />
              </div>
              <div className="flex flex-1 items-center gap-4 sm:flex-col">
                <Skeleton
                  className="aspect-208/120 w-full rounded-sm max-sm:w-20 sm:rounded-lg"
                  data-testid="skeleton-text"
                />
                <Skeleton className="h-4 w-full max-w-56" data-testid="skeleton-text" />
              </div>
              <div className="flex flex-1 items-center gap-4 sm:flex-col">
                <Skeleton
                  className="aspect-208/120 w-full rounded-sm max-sm:w-20 sm:rounded-lg"
                  data-testid="skeleton-text"
                />
                <Skeleton className="h-4 w-full max-w-56" data-testid="skeleton-text" />
              </div>
            </div>
          </CardPanel>
        </Card>
        <CardFrameFooter className="flex justify-end">
          <Skeleton className="h-9 w-20 rounded-lg sm:h-8" data-testid="skeleton-text" />
        </CardFrameFooter>
      </CardFrame>

      <CardFrame>
        <CardFrameHeader>
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <CardFrameTitle>
                <Skeleton className="my-0.5 h-4 w-44" data-testid="skeleton-text" />
              </CardFrameTitle>
              <CardFrameDescription>
                <Skeleton className="my-0.5 h-4 w-72 max-w-full" data-testid="skeleton-text" />
              </CardFrameDescription>
            </div>
            <Skeleton
              className="h-5.5 w-9.5 shrink-0 rounded-full sm:h-4.5 sm:w-7.5"
              data-testid="skeleton-text"
            />
          </div>
        </CardFrameHeader>
      </CardFrame>

      {[1, 2, 3].map((key) => (
        <Card key={key}>
          <CardPanel>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <Skeleton className="h-4 w-56 max-w-full" data-testid="skeleton-text" />
                <Skeleton className="h-4 w-full max-w-lg" data-testid="skeleton-text" />
              </div>
              <Skeleton
                className="h-5.5 w-9.5 shrink-0 rounded-full sm:h-4.5 sm:w-7.5"
                data-testid="skeleton-text"
              />
            </div>
          </CardPanel>
        </Card>
      ))}
    </div>
  );
};
