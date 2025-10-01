"use client";

import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";

export const OrgBillingInfo = ({ orgId }: { orgId: number }) => {
  const { data: billingData, isLoading } = trpc.viewer.organizations.adminGetBilling.useQuery({
    id: orgId,
  });

  if (isLoading) {
    return (
      <PanelCard title="Stripe & Billing">
        <div className="space-y-3 p-4">
          <SkeletonText className="h-4 w-full" />
          <SkeletonText className="h-4 w-full" />
          <SkeletonText className="h-4 w-full" />
        </div>
      </PanelCard>
    );
  }

  if (!billingData?.stripeCustomerId) {
    return (
      <PanelCard title="Stripe & Billing">
        <div className="text-subtle p-4 text-sm">
          No Stripe billing information available for this organization.
        </div>
      </PanelCard>
    );
  }

  const stripeCustomerUrl = `https://dashboard.stripe.com/customers/${billingData.stripeCustomerId}`;
  const stripeSubscriptionUrl = billingData.stripeSubscriptionId
    ? `https://dashboard.stripe.com/subscriptions/${billingData.stripeSubscriptionId}`
    : null;

  return (
    <PanelCard title="Stripe & Billing">
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-emphasis text-sm font-medium">Stripe Customer</div>
            <div className="text-subtle font-mono text-xs">{billingData.stripeCustomerId}</div>
          </div>
          <Button
            color="secondary"
            StartIcon="external-link"
            href={stripeCustomerUrl}
            target="_blank"
            rel="noopener noreferrer">
            View in Stripe
          </Button>
        </div>

        {billingData.stripeSubscriptionId && (
          <div className="border-subtle flex items-center justify-between border-t pt-4">
            <div>
              <div className="text-emphasis text-sm font-medium">Stripe Subscription</div>
              <div className="text-subtle font-mono text-xs">{billingData.stripeSubscriptionId}</div>
              {billingData.subscriptionDetails && (
                <div className="mt-1">
                  <Badge
                    variant={
                      billingData.subscriptionDetails.status === "active"
                        ? "green"
                        : billingData.subscriptionDetails.status === "canceled"
                        ? "red"
                        : "gray"
                    }>
                    {billingData.subscriptionDetails.status}
                  </Badge>
                </div>
              )}
            </div>
            {stripeSubscriptionUrl && (
              <Button
                color="secondary"
                StartIcon="external-link"
                href={stripeSubscriptionUrl}
                target="_blank"
                rel="noopener noreferrer">
                View in Stripe
              </Button>
            )}
          </div>
        )}

        {(billingData.seats || billingData.pricePerSeat || billingData.billingPeriod) && (
          <div className="border-subtle space-y-2 border-t pt-4">
            <div className="text-emphasis mb-2 text-sm font-medium">Billing Details</div>
            {billingData.seats && (
              <div className="flex justify-between text-sm">
                <span className="text-subtle">Seats:</span>
                <span className="text-default font-medium">{billingData.seats}</span>
              </div>
            )}
            {billingData.pricePerSeat && (
              <div className="flex justify-between text-sm">
                <span className="text-subtle">Price per Seat:</span>
                <span className="text-default font-medium">${billingData.pricePerSeat}</span>
              </div>
            )}
            {billingData.billingPeriod && (
              <div className="flex justify-between text-sm">
                <span className="text-subtle">Billing Period:</span>
                <span className="text-default font-medium capitalize">
                  {billingData.billingPeriod.toLowerCase()}
                </span>
              </div>
            )}
          </div>
        )}

        {billingData.subscriptionDetails && (
          <div className="border-subtle space-y-2 border-t pt-4">
            <div className="text-emphasis mb-2 text-sm font-medium">Current Period</div>
            <div className="flex justify-between text-sm">
              <span className="text-subtle">Start:</span>
              <span className="text-default">
                {new Date(billingData.subscriptionDetails.currentPeriodStart * 1000).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-subtle">End:</span>
              <span className="text-default">
                {new Date(billingData.subscriptionDetails.currentPeriodEnd * 1000).toLocaleDateString()}
              </span>
            </div>
            {billingData.subscriptionDetails.cancelAtPeriodEnd && (
              <div className="mt-2 flex items-center gap-2">
                <Icon name="info" className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-orange-600">Subscription will cancel at period end</span>
              </div>
            )}
          </div>
        )}
      </div>
    </PanelCard>
  );
};
