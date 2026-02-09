export function RoutingSkeleton() {
  return (
    <div className="w-full py-4 lg:py-8">
      <div className="flex w-full flex-col rounded-md">
        <div className="bg-cal-muted border-muted rounded-2xl border p-2.5">
          {[1, 2, 3].map((index) => (
            <div key={index}>
              {/* Title */}
              <div
                className="my-1 flex flex-col gap-0.5 p-1"
                style={{
                  height: "52px",
                }}>
                <div className="flex items-center gap-2 px-2 py-1">
                  <div className="bg-subtle h-4 w-4 animate-pulse rounded" />
                  <div className="bg-subtle h-8 w-32 animate-pulse rounded" />
                </div>
              </div>
              {/* Form Fields */}
              <div className="bg-default border-subtle mb-0.5 flex flex-col gap-0.5 rounded-2xl border p-4">
                <div className="flex items-center gap-2 px-2 py-1">
                  <div className="border-subtle rounded-lg border p-1">
                    <div className="bg-subtle h-4 w-4 animate-pulse rounded" />
                  </div>
                  <div className="bg-subtle h-4 w-32 animate-pulse rounded" />
                </div>

                <div className="bg-cal-muted rounded-xl p-0.5">
                  <div className="flex items-center gap-2 py-1 pl-3">
                    {/* If booker selects */}
                    <div className="bg-subtle h-4 w-32 animate-pulse rounded" />
                    <div className="bg-subtle h-4 w-16 animate-pulse rounded" />
                  </div>
                  <div className="bg-default rounded-[10px] px-3 py-2 ">
                    <div className="stack-y-3">
                      {/* Label Field */}
                      <div className="flex items-center justify-between gap-[10px]">
                        <div className="bg-subtle h-4 w-full animate-pulse rounded" />
                        <div className="bg-subtle h-4 w-full animate-pulse rounded" />
                        <div className="bg-subtle h-4 w-full animate-pulse rounded" />
                      </div>

                      {/* Identifier Field */}
                      <div className="flex items-center justify-between gap-[10px]">
                        <div className="bg-subtle h-4 w-full animate-pulse rounded" />
                        <div className="bg-subtle h-4 w-full animate-pulse rounded" />
                        <div className="bg-subtle h-4 w-full animate-pulse rounded" />
                      </div>

                      {/* Type Field */}
                      <div className="flex items-center justify-between gap-[10px]">
                        <div className="bg-subtle h-4 w-full animate-pulse rounded" />
                        <div className="bg-subtle h-4 w-full animate-pulse rounded" />
                        <div className="bg-subtle h-4 w-full animate-pulse rounded" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 py-1 pl-3">
                  <div className="bg-subtle my-1 h-6 w-24 animate-pulse rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Question Button */}
        <div className="flex">
          <div className="bg-subtle h-9 w-32 animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}
