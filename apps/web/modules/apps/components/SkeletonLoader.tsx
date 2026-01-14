import { ShellSubHeading } from "@calcom/ui/components/layout";
import { SkeletonText } from "@calcom/ui/components/skeleton";

export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <>
      <ShellSubHeading title={<div className="bg-subtle h-6 w-32" />} {...{ className }} />
      <ul className="bg-default border-subtle divide-subtle -mx-4 animate-pulse divide-y rounded-md border sm:mx-0 sm:overflow-hidden">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </ul>
    </>
  );
}

function SkeletonItem() {
  return (
    <li className="group flex w-full items-center justify-between p-3">
      <div className="grow truncate text-sm">
        <div className="flex justify-start space-x-2 rtl:space-x-reverse">
          <SkeletonText className="h-10 w-10" />
          <div className="stack-y-1">
            <div>
              <SkeletonText className="h-4 w-16" />
            </div>
            <div>
              <SkeletonText className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 hidden shrink-0 sm:ml-5 sm:mt-0 lg:flex">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <SkeletonText className="h-11 w-32" />
        </div>
      </div>
    </li>
  );
}
