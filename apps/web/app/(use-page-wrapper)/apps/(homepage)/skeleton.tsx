import { SkeletonContainer } from "@calcom/ui/components/skeleton";

export function AppHomePageSkeleton() {
  const t = (key: string) => key;

  return (
    <div className="bg-default relative z-0 flex-1 pb-8">
      <div className="max-w-full p-2 sm:py-4 lg:px-6">
        <div className="bg-default sticky top-0 z-10 mb-0 flex items-center py-2 md:mb-6 md:mt-0 lg:mb-8">
          <div className="w-full truncate ltr:mr-4 rtl:ml-4 md:block">
            <h3 className="font-cal text-emphasis max-w-28 sm:max-w-72 md:max-w-80 hidden truncate text-lg font-semibold tracking-wide sm:text-xl md:block xl:max-w-full">
              <div className="h-6 w-40 rounded bg-gray-200" />
            </h3>
            <p className="text-default hidden text-sm md:block">
              <div className="mt-1 h-4 w-64 rounded bg-gray-200" />
            </p>
          </div>
          <div className="flex w-full flex-col pt-4 md:flex-row md:justify-between md:pt-0 lg:w-auto">
            <div className="ltr:mr-2 rtl:ml-2 lg:hidden">
              <div className="flex space-x-2">
                <div className="h-9 w-24 rounded-md bg-gray-200" />
                <div className="h-9 w-24 rounded-md bg-gray-200" />
              </div>
            </div>
            <div>
              <div className="h-9 w-48 rounded-md bg-gray-200" />
            </div>
          </div>
        </div>

        <SkeletonContainer>
          <div className="flex flex-col gap-y-8">
            {/* Featured Categories section */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="h-6 w-40 rounded bg-gray-200" />
                <div className="flex">
                  <div className="mx-1 h-8 w-8 rounded-md bg-gray-200" />
                  <div className="mx-1 h-8 w-8 rounded-md bg-gray-200" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={`category-${i}`}
                      className="flex h-48 flex-col items-center justify-center rounded-md bg-gray-100 p-4">
                      <div className="mb-3 h-14 w-14 rounded-full bg-gray-200" />
                      <div className="h-5 w-24 rounded bg-gray-200" />
                      <div className="mt-1 h-4 w-16 rounded bg-gray-200" />
                    </div>
                  ))}
              </div>
            </div>

            {/* Most Popular section */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="h-6 w-40 rounded bg-gray-200" />
                <div className="flex">
                  <div className="mx-1 h-8 w-8 rounded-md bg-gray-200" />
                  <div className="mx-1 h-8 w-8 rounded-md bg-gray-200" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={`app-${i}`} className="flex flex-col rounded-md border border-gray-200 p-4">
                      <div className="flex items-center">
                        <div className="mr-3 h-10 w-10 rounded-md bg-gray-200" />
                        <div className="flex-1">
                          <div className="h-5 w-32 rounded bg-gray-200" />
                          <div className="mt-1 h-4 w-24 rounded bg-gray-200" />
                        </div>
                      </div>
                      <div className="mt-3 h-4 w-full rounded bg-gray-200" />
                      <div className="mt-2 h-4 w-3/4 rounded bg-gray-200" />
                      <div className="mt-4 flex justify-between">
                        <div className="h-9 w-24 rounded-md bg-gray-200" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* All Apps section */}
            <div className="mt-4">
              <div className="relative mb-4 flex flex-col justify-between lg:flex-row lg:items-center">
                <div className="h-6 w-32 rounded bg-gray-200" />
                <div className="mt-3 flex max-w-full space-x-1 overflow-x-auto lg:mt-0 lg:max-w-[50%]">
                  <div className="bg-emphasis text-default min-w-max rounded-md px-4 py-2.5 text-sm font-medium">
                    <div className="h-4 w-16 rounded bg-gray-100" />
                  </div>
                  {Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={`tab-${i}`}
                        className="bg-muted text-emphasis rounded-md px-4 py-2.5 text-sm font-medium">
                        <div className="h-4 w-16 rounded bg-gray-200" />
                      </div>
                    ))}
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-4 [@media(max-width:1270px)]:grid-cols-3 [@media(max-width:500px)]:grid-cols-1 [@media(max-width:730px)]:grid-cols-1">
                {Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={`all-app-${i}`}
                      className="border-subtle relative flex h-64 flex-col rounded-md border p-5">
                      <div className="flex">
                        <div className="mb-4 h-12 w-12 rounded-sm bg-gray-200" />
                      </div>
                      <div className="flex items-center">
                        <div className="h-5 w-32 rounded bg-gray-200" />
                      </div>
                      <div className="mt-2 flex-grow">
                        <div className="mb-2 h-4 w-full rounded bg-gray-200" />
                        <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
                      </div>
                      <div className="mt-5 flex max-w-full flex-row justify-between gap-2">
                        <div className="h-9 w-32 flex-grow rounded-md bg-gray-200" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </SkeletonContainer>
      </div>
    </div>
  );
}
