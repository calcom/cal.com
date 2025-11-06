import type { ReactNode } from "react";

import { SkeletonText } from "@calcom/ui/components/skeleton";

type OnboardingCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  isLoading?: boolean;
};

export const OnboardingCard = ({ title, subtitle, children, footer, isLoading }: OnboardingCardProps) => {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      {/* Card Header */}
      <div className="flex w-full gap-1.5 px-1 py-4">
        <div className="flex w-full flex-col gap-1">
          <h1 className="font-cal text-xl font-semibold leading-6">{title}</h1>
          <p className="text-subtle text-sm font-medium leading-tight">{subtitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SkeletonText className="h-40 w-full" />
            <SkeletonText className="h-40 w-full" />
          </div>
        ) : (
          children
        )}
      </div>

      {/* Footer */}
      <div className="flex w-full items-center justify-start px-5 py-4">{footer}</div>
    </div>
  );
};
