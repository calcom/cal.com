import { SkeletonText } from "@calcom/ui/components/skeleton";

import { ChartCard } from "./ChartCard";

export const LoadingInsight = () => {
  return (
    <ChartCard title={<SkeletonText className="w-32" />}>
      <div className="m-auto flex h-80 flex-col items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          className="animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    </ChartCard>
  );
};
