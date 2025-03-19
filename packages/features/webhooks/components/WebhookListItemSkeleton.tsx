import { SkeletonText } from "@calcom/ui/components/skeleton";

export default function WebhookListItemSkeleton() {
  return (
    <div className="flex w-full justify-between p-4">
      <div>
        <p className="text-emphasis text-sm font-medium">
          <SkeletonText className="h-4 w-56" />
        </p>
        <div className="mt-2.5 w-max">
          <SkeletonText className="h-5 w-28" />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <SkeletonText className="h-9 w-9" />
      </div>
    </div>
  );
}
