import RecordingListItemSkeleton from "@calcom/features/ee/video/components/RecordingListItemSkeleton";
import { SkeletonContainer } from "@calcom/ui/components/skeleton";

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
