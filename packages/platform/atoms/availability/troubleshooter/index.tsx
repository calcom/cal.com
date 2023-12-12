import { Skeleton, Button } from "@calcom/ui";

export function Troubleshooter() {
  return (
    <div className="rounded-md">
      <Skeleton as="h3" className="mb-0 inline-block text-sm font-medium">
        Something doesn&apos;t look right?
      </Skeleton>
      <div className="mt-3 flex">
        <Skeleton as={Button} href="/availability/troubleshoot" color="secondary">
          Launch troubleshooter
        </Skeleton>
      </div>
    </div>
  );
}
