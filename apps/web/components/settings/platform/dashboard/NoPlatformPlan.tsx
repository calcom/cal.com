import { EmptyScreen, Button } from "@calcom/ui";

export default function NoPlatformPlan() {
  return (
    <EmptyScreen
      Icon="credit-card"
      headline="Subscription needed"
      description="You are not subscribed to a Platform plan."
      buttonRaw={
        <div className="flex gap-2">
          <Button
            className="hover:bg-slate-300 hover:text-black"
            color="secondary"
            href="/settings/platform/new">
            Subscribe
          </Button>
          <Button
            color="secondary"
            className="hover:bg-slate-300 hover:text-black"
            href="https://cal.com/platform/pricing"
            target="_blank">
            Go to Pricing
          </Button>
          <Button
            color="secondary"
            className="hover:bg-slate-300 hover:text-black"
            href="https://cal.com/sales"
            target="_blank">
            Contact Sales
          </Button>
        </div>
      }
    />
  );
}
