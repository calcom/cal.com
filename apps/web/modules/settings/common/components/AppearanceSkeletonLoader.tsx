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

export const AppearanceSkeletonLoader = () => {
  return (
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
  );
};
