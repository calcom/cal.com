import { SkeletonText } from "@calcom/ui/components/skeleton";

export function ListSkeleton() {
  return (
    <ul className="focus-within:border-emphasis flex justify-between p-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <li key={idx}>
          <AttributeSkeleton />
        </li>
      ))}
    </ul>
  );
}

function AttributeSkeleton() {
  return (
    <div>
      <SkeletonText className="text-sm font-semibold leading-none" />
      <SkeletonText className="text-default inline-flex items-center gap-1 text-sm font-normal leading-none" />
    </div>
  );
}
