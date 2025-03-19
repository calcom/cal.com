import { SkeletonContainer } from "@calcom/ui/components/skeleton";

import RecordingListItemSkeleton from "./RecordingListItemSkeleton";

export default function RecordingListSkeleton() {
  return (
    <SkeletonContainer>
      <div className="flex flex-col gap-3">
        <RecordingListItemSkeleton />
        <RecordingListItemSkeleton />
        <RecordingListItemSkeleton />
      </div>
    </SkeletonContainer>
  );
}
