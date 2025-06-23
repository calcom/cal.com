import { SkeletonText, SkeletonContainer, SkeletonButton } from "@calcom/ui/components/skeleton";

export function BillingCreditsSkeleton() {
  return (
    <SkeletonContainer>
      <div className="border-subtle mt-8 space-y-6 rounded-lg border px-6 py-6 text-sm sm:space-y-8">
        {/* Title and Description */}
        <div>
          <div>
            <SkeletonText className="mb-2 h-4 w-20" /> {/* Credits title */}
          </div>
          <div>
            <SkeletonText className="h-4 w-72" /> {/* Description */}
          </div>

          <div className="-mx-6 mt-6">
            <hr className="border-subtle" />
          </div>
          {/* Monthly credits */}
          <div className="mt-[20px]">
            <SkeletonText className="mb-4 h-4 w-32" /> {/* Monthly credits label */}
            <div className="h-2 w-full rounded-md bg-gray-200" /> {/* Progress bar */}
            <div className="text-subtle mt-2">
              <div>
                <SkeletonText className="h-4 w-40" /> {/* Total credits */}
              </div>
              <div>
                <SkeletonText className="h-4 w-40" /> {/* Remaining credits */}
              </div>
            </div>
          </div>
          {/* Additional credits */}
          <div className="mt-4">
            <div>
              <SkeletonText className="mb-2 h-4 w-40" /> {/* Additional credits label */}
            </div>
            <div>
              <SkeletonText className="h-4 w-24" /> {/* Additional credits value */}
            </div>
          </div>
          <div className="-mx-6 mb-6 mt-4">
            <hr className="border-subtle mb-3 mt-3" />
          </div>
          {/* Buy credits form */}
          <div className="flex">
            <div className="mr-auto">
              <div>
                <SkeletonText className="mb-2 h-4 w-[268px]" /> {/* Buy credits label */}
              </div>
              <div>
                <SkeletonText className="mt-2 h-8 w-[240px] rounded-md" /> {/* Input field */}
              </div>
            </div>

            <div className="mt-auto ">
              <SkeletonButton className="h-9 w-[120px] rounded-md" /> {/* Buy button */}
            </div>
          </div>
          <div className="-mx-6 mb-6 mt-6">
            <hr className="border-subtle mb-3 mt-3" />
          </div>
          {/* Download expense log */}
          <div className="flex">
            <div className="mr-auto mt-1">
              <div>
                <SkeletonText className="mb-2 h-4 w-[156px]" /> {/* Label */}
              </div>
              <div>
                <SkeletonText className="mt-2 h-8 w-[156px] rounded-md" /> {/* Select */}
              </div>
            </div>

            <div className="mt-auto ">
              <SkeletonButton className="h-9 w-[109px] rounded-md" /> {/* Download button */}
            </div>
          </div>
        </div>
      </div>
    </SkeletonContainer>
  );
}
