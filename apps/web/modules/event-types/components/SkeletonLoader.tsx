import { Icon } from "@calcom/ui/components/icon";
import { SkeletonAvatar, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";

function SkeletonLoader() {
  return (
    <SkeletonContainer>
      <div className="mb-4 flex items-center">
        <SkeletonAvatar className="h-8 w-8" />
        <div className="flex flex-col stack-y-1">
          <SkeletonText className="h-4 w-16" />
          <SkeletonText className="h-4 w-24" />
        </div>
      </div>
      <ul className="border-subtle bg-default divide-subtle divide-y rounded-md border sm:mx-0 sm:overflow-hidden">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </ul>
    </SkeletonContainer>
  );
}

export default SkeletonLoader;

export function InfiniteSkeletonLoader() {
  return (
    <SkeletonContainer>
      <ul className="border-subtle bg-default divide-subtle divide-y rounded-md border sm:mx-0 sm:overflow-hidden">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </ul>
    </SkeletonContainer>
  );
}

function TabsSkeletonLoader() {
  return (
    <div className="mb-2.5 max-w-full">
      <nav className="no-scrollbar flex space-x-0.5 overflow-x-scroll rounded-md">
        <div className="bg-subtle inline-flex h-fit items-center justify-center whitespace-nowrap rounded-md p-1">
          <SkeletonAvatar className="mb-1 mr-1 h-4 w-4 rounded-full" />
          <SkeletonText className="h-4 w-16" />
        </div>
        <div className="inline-flex h-fit items-center justify-center whitespace-nowrap rounded-md p-1">
          <SkeletonAvatar className="mb-1 mr-1 h-4 w-4 rounded-full" />
          <SkeletonText className="h-4 w-16" />
        </div>
      </nav>
    </div>
  );
}

export function SearchSkeletonLoader() {
  return (
    <div className="max-w-64 mb-4">
      <div className="bg-default border-default flex h-8 items-center gap-1 rounded-[10px] border px-3 py-2">
        <div className="flex items-center justify-center">
          <Icon name="search" className="text-subtle h-4 w-4" />
        </div>
        <SkeletonText className="max-w-56 h-4 w-full" />
      </div>
    </div>
  );
}

export function EventTypesSkeletonLoader() {
  return (
    <SkeletonContainer>
      <TabsSkeletonLoader />
      <SearchSkeletonLoader />
      <ul className="border-subtle bg-default divide-subtle divide-y rounded-md border sm:mx-0 sm:overflow-hidden">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </ul>
    </SkeletonContainer>
  );
}

function SkeletonItem() {
  return (
    <li className="group flex w-full items-center justify-between px-4 py-4 sm:px-6">
      <div className="grow truncate text-sm">
        <div>
          <SkeletonText className="h-5 w-32" />
        </div>
        <div className="">
          <ul className="mt-2 flex space-x-4 rtl:space-x-reverse ">
            <li className="flex items-center whitespace-nowrap">
              <Icon name="clock" className="text-subtle mr-1.5 mt-0.5 inline h-4 w-4" />
              <SkeletonText className="h-4 w-12" />
            </li>
            <li className="flex items-center whitespace-nowrap">
              <Icon name="user" className="text-subtle mr-1.5 mt-0.5 inline h-4 w-4" />
              <SkeletonText className="h-4 w-12" />
            </li>
          </ul>
        </div>
      </div>
    </li>
  );
}
