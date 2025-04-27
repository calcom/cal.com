"use client";

export function AttributesSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-subtle mb-8 h-6 w-24 rounded-md" />
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="border-subtle flex justify-between rounded-md border p-4">
            <div>
              <div className="bg-subtle mb-2 h-5 w-32 rounded-md" />
              <div className="bg-subtle h-4 w-24 rounded-md" />
            </div>
            <div className="flex gap-4">
              <div className="bg-subtle h-6 w-10 rounded-md" />
              <div className="bg-subtle h-6 w-6 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
