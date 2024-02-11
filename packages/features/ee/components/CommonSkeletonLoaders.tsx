import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { Meta, SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui";

export const AppearanceSkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} borderInShellHeader={false} />
      <div className="border-subtle mt-6 flex items-center rounded-t-xl border p-6 text-sm">
        <SkeletonText className="h-8 w-1/3" />
      </div>
      <div className="border-subtle space-y-6 border-x px-4 py-6 sm:px-6">
        <div className="flex w-full items-center justify-center gap-6">
          <div className="bg-emphasis h-32 flex-1 animate-pulse rounded-md p-5" />
          <div className="bg-emphasis h-32 flex-1 animate-pulse rounded-md p-5" />
          <div className="bg-emphasis h-32 flex-1 animate-pulse rounded-md p-5" />
        </div>
        <div className="flex justify-between">
          <SkeletonText className="h-8 w-1/3" />
          <SkeletonText className="h-8 w-1/3" />
        </div>

        <SkeletonText className="h-8 w-full" />
      </div>
      <div className="rounded-b-xl">
        <SectionBottomActions align="end">
          <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
        </SectionBottomActions>
      </div>
    </SkeletonContainer>
  );
};
