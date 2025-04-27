import { AttributesSkeleton } from "./skeleton";

export default function Loading() {
  return (
    <div className="border-subtle bg-default flex flex-col gap-4 rounded-lg border p-6">
      <AttributesSkeleton />
    </div>
  );
}
