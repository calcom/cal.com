import { SkeletonContainer } from "@calcom/ui";

import WebhookListItemSkeleton from "./WebhookListItemSkeleton";

export default function WebhookListSkeleton() {
  return (
    <SkeletonContainer>
      <div className="mt-6 mb-8 divide-y rounded-md border">
        <WebhookListItemSkeleton />
        <WebhookListItemSkeleton />
        <WebhookListItemSkeleton />
      </div>
    </SkeletonContainer>
  );
}
