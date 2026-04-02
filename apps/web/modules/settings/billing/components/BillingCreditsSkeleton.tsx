import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";

export function BillingCreditsSkeleton() {
  return (
    <SkeletonContainer>
      <div className="bg-cal-muted border-muted mt-5 rounded-xl p-1">
        <div className="flex flex-col gap-1 px-4 py-5">
          <SkeletonText className="h-4 w-20" /> {/* Credits title */}
          <SkeletonText className="h-4 w-48" /> {/* View and manage credits description */}
        </div>
        <div className="bg-default border-muted flex w-full rounded-[10px] px-5 py-4">
          <div className="w-full">
            {/* Credits section */}
            <div className="mb-4">
              {/* Monthly credits row */}
              <div className="mt-1 flex justify-between">
                <SkeletonText className="h-4 w-32" />
                <SkeletonText className="h-4 w-20" />
              </div>
              {/* Additional credits row */}
              <div className="mt-1 flex justify-between">
                <SkeletonText className="h-4 w-36" />
                <SkeletonText className="h-4 w-20" />
              </div>
              {/* Remaining row */}
              <div className="mt-1 flex justify-between">
                <SkeletonText className="h-4 w-24" />
                <SkeletonText className="h-4 w-20" />
              </div>
              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-2 w-full rounded-md bg-gray-200" />
              </div>
              {/* Credits per tip */}
              <div className="mt-4 flex flex-1 justify-between">
                <SkeletonText className="h-4 w-32" />
                <SkeletonButton className="h-8 w-24 rounded-md" />
              </div>
            </div>
            <div className="-mx-5 mt-5">
              <hr className="border-subtle" />
            </div>
            {/* Additional Credits form */}
            <div className="mt-4 flex">
              <div className="-mb-1 mr-auto w-full">
                <SkeletonText className="mb-2 h-4 w-32" /> {/* Additional credits label */}
                <div className="flex w-full">
                  <SkeletonText className="h-9 w-full rounded-md" /> {/* Input field */}
                </div>
              </div>
              <div className="ml-2 mt-auto">
                <SkeletonButton className="h-9 w-12 rounded-md" /> {/* Buy button */}
              </div>
            </div>
            <div className="-mx-5 mt-5">
              <hr className="border-subtle" />
            </div>
            {/* Download Expense Log */}
            <div className="mt-4 flex">
              <div className="mr-auto w-full">
                <SkeletonText className="mb-4 h-4 w-40" /> {/* Download expense log label */}
                <div className="mr-2 mt-1">
                  <SkeletonText className="h-9 w-full rounded-md" /> {/* Select dropdown */}
                </div>
              </div>
              <div className="mt-auto">
                <SkeletonButton className="h-9 w-20 rounded-md" /> {/* Download button */}
              </div>
            </div>
          </div>
        </div>
        {/* Credit Worth Section */}
        <div className="text-subtle px-5 py-4">
          <SkeletonText className="h-4 w-full" />
          <SkeletonText className="mt-1 h-4 w-3/4" />
        </div>
      </div>
    </SkeletonContainer>
  );
}
