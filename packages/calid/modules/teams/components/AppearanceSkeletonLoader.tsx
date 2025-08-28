import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";

const ContentPlaceholder = () => (
  <div className="border-subtle rounded-b-xl border px-4 py-6 sm:px-6">
    <SkeletonText className="h-8 w-1/3 mb-6" />
    <div className="space-y-6">
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
  </div>
);

const AdditionalContainers = () => (
  <>
    <div className="bg-emphasis mt-4 h-8 w-full animate-pulse rounded-md" />
    <div className="bg-emphasis mt-4 h-8 w-full animate-pulse rounded-md" />
  </>
);

export const AppearanceSkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <ContentPlaceholder />
      <AdditionalContainers />
    </SkeletonContainer>
  );
};
