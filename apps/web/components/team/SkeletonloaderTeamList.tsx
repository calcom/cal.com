import { SkeletonText } from "@calcom/ui";

function SkeletonLoaderTeamList() {
  return (
    <>
      <ul className="-mx-4 animate-pulse divide-y divide-neutral-200 rounded-sm border border-gray-200 bg-white sm:mx-0 sm:overflow-hidden">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </ul>
    </>
  );
}

export default SkeletonLoaderTeamList;

function SkeletonItem() {
  return (
    <li className="group flex w-full items-center justify-between px-3 py-4">
      <div className="flex-grow truncate text-sm">
        <div className="flex justify-start space-x-2 px-2">
          <SkeletonText width="10" height="10" className="rounded-full" />
          <div className="space-y-2">
            <SkeletonText height="4" width="32" />
            <SkeletonText height="4" width="16" />
          </div>
        </div>
      </div>
      <div className="mt-4 hidden flex-shrink-0 pr-4 sm:mt-0 sm:ml-5 lg:flex">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <SkeletonText width="12" height="4" />
          <SkeletonText width="4" height="4" />
          <SkeletonText width="4" height="4" />
        </div>
      </div>
    </li>
  );
}
