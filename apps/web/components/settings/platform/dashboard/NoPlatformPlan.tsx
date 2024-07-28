import { EmptyScreen, Button } from "@calcom/ui";

export default function NoPlatformPlan() {
  return (
    <EmptyScreen
      Icon="credit-card"
      headline="Subscription needed"
      description="You are not subscribed to a Platform plan."
      buttonRaw={
        <div className="flex gap-2">
          <Button href="https://cal.com/platform/pricing">Go to Pricing</Button>
          <Button color="secondary" href="https://cal.com/pricing">
            Contact Sales
          </Button>
        </div>
      }
    />
  );
}
