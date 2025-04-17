export function RoutingSkeleton() {
  return (
    <div className="w-full py-4 lg:py-8">
      <div className="flex w-full flex-col rounded-md">
        <div className="bg-muted border-muted rounded-2xl border p-1">
          {[1, 2, 3].map((index) => (
            <div key={index}>
              {/* Title */}
              <div className="mb-0.5 flex flex-col gap-0.5 p-1">
                <div className="flex items-center gap-2 px-2 py-1">
                  <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
              {/* Form Fields */}
              <div className="bg-default border-subtle mb-0.5 flex flex-col gap-0.5 rounded-2xl border p-1">
                <div className="flex items-center gap-2 px-2 py-1">
                  <div className="border-subtle rounded-lg border p-1">
                    <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                  </div>
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="border-subtle bg-muted rounded-xl border px-3 py-2">
                  <div className="space-y-3">
                    {/* Label Field */}
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                      <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                    </div>

                    {/* Identifier Field */}
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                      <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                    </div>

                    {/* Type Field */}
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                      <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                    </div>

                    {/* Required Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                      <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Question Button */}
        <div className="flex">
          <div className="h-9 w-32 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
