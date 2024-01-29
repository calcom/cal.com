import { Skeleton, Button } from "@calcom/ui";

type TroubleshooterProps = {
  isDisplayBlock: boolean;
  translationLabels: {
    title?: string;
    ctaLabel?: string;
  };
};

export function Troubleshooter({
  isDisplayBlock = false,
  translationLabels = {
    title: `Something doesn&apos;t look right?`,
    ctaLabel: "Launch troubleshooter",
  },
}: TroubleshooterProps) {
  return (
    <div className={isDisplayBlock ? "rounded-md md:block" : "rounded-md"}>
      <Skeleton as="h3" className="mb-0 inline-block text-sm font-medium">
        {translationLabels.title}
      </Skeleton>
      <div className="mt-3 flex">
        <Skeleton as={Button} href="/availability/troubleshoot" color="secondary">
          {translationLabels.ctaLabel}
        </Skeleton>
      </div>
    </div>
  );
}
