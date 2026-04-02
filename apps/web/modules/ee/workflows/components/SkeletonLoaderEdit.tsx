import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";

function SkeletonLoader() {
  return (
    <SkeletonContainer>
      <SkeletonText className="mx-auto my-8 h-48 w-full max-w-4xl" />
      <SkeletonText className="mx-auto my-8 h-80 w-full max-w-4xl" />
    </SkeletonContainer>
  );
}

export default SkeletonLoader;
