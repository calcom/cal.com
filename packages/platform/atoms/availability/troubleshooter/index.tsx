import { Skeleton, Button } from "@calcom/ui";

type TroubleshooterProps = {
  isDisplayBlock: boolean;
};

export function Troubleshooter({ isDisplayBlock = false }: TroubleshooterProps) {
  return (
    <div className={isDisplayBlock ? "rounded-md md:block" : "rounded-md"}>
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
