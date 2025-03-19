import { SkeletonText, SkeletonAvatar } from "@calcom/ui/components/skeleton";

function SkeletonLoader() {
  return (
    <ul className="bg-default divide-subtle animate-pulse sm:overflow-hidden">
      <SkeletonItem />
      <SkeletonItem />
    </ul>
  );
}

export default SkeletonLoader;

function SkeletonItem() {
  return (
    <li className="border-subtle group mb-4 flex h-[90px] w-full items-center justify-between rounded-md border px-4 py-4 sm:px-6">
      <div className="flex-grow truncate text-sm">
        <div className="flex">
          <SkeletonAvatar className="h-10 w-10" />

          <div className="ml-4 mt-1 flex flex-col space-y-1">
            <SkeletonText className="h-5 w-20 sm:w-24" />
            <div className="flex">
              <SkeletonText className="h-4 w-16 ltr:mr-2 rtl:ml-2 sm:w-28" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-0 flex flex-shrink-0 sm:ml-5">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <SkeletonText className="h-8 w-8 sm:w-16" />
          <SkeletonText className="h-8 w-8 sm:w-16" />
        </div>
      </div>
    </li>
  );
}
