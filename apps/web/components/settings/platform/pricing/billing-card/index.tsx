import { Button } from "@calcom/ui";

type PlatformBillingCardProps = {
  plan: string;
  description: string;
  pricing?: number;
  includes: string[];
  isLoading?: boolean;
  handleSubscribe?: () => void;
};

export const PlatformBillingCard = ({
  plan,
  description,
  pricing,
  includes,
  isLoading,
  handleSubscribe,
}: PlatformBillingCardProps) => {
  return (
    <div className="border-subtle mx-4 w-auto rounded-md border p-5 ">
      <div className="pb-5">
        <h1 className="pb-3 pt-3 text-xl font-semibold">{plan}</h1>
        <p className="pb-5 text-base">{description}</p>
        <h1 className="text-3xl font-semibold">
          {pricing && (
            <>
              US${pricing} <span className="text-sm">per month</span>
            </>
          )}
        </h1>
      </div>
      <div>
        <Button
          loading={isLoading}
          onClick={handleSubscribe}
          className="flex w-[100%] items-center justify-center">
          {pricing ? "Subscribe" : "Schedule a time"}
        </Button>
      </div>
      <div className="mt-5">
        <p>This includes:</p>
        {includes.map((feature) => {
          return (
            <div key={feature} className="my-2 flex">
              <div className="pr-2">&bull;</div>
              <div>{feature}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
