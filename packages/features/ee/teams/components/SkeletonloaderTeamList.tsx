import { SkeletonText } from "@calcom/ui";

function SkeletonLoaderTeamList() {
  return (
    <>
      <ul className="-mx-4 animate-pulse divide-y divide-neutral-200 rounded-md border border-subtle bg-default sm:mx-0 sm:overflow-hidden">
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
        <div className="flex justify-start space-x-2 px-2 rtl:space-x-reverse">
          <SkeletonText className="h-10 w-10 rounded-full" />
          <div className="flex flex-col space-y-2">
            <SkeletonText className="h-4 w-32" />
            <SkeletonText className="h-4 w-16" />
          </div>
        </div>
      </div>
      <div className="mt-4 hidden flex-shrink-0 pr-4 sm:mt-0 sm:ml-5 lg:flex">
        <div className="flex justify-between space-x-2 rtl:space-x-reverse">
          <SkeletonText className="h-4 w-12" />
          <SkeletonText className="h-4 w-4" />
          <SkeletonText className="h-4 w-4" />
        </div>
      </div>
    </li>
  );
}
