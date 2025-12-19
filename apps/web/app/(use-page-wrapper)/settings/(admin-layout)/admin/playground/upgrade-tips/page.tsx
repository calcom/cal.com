"use client";

import { Button } from "@coss/ui/components/button";
import { ExternalLink, TrendingUp } from "lucide-react";
import { useState } from "react";

import { MailIcon } from "@calcom/features/tips/MailIcon";
import {
  UpsellBanner,
  UpsellCard,
  UpsellDialog,
  UpsellInlineAlert,
  UpsellSidebar,
} from "@calcom/features/tips/UpsellTip";
import { Icon } from "@calcom/ui/components/icon";

export default function UpgradeTipsPlayground() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-10 p-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Upsell Components Playground</h1>
      </div>

      {/* Banner Variant */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Banner Variant</h2>
        <p className="text-muted-foreground text-sm">
          Used for full-width announcements or top-of-page tips.
        </p>

        {/* Figma Design Match */}
        <UpsellBanner
          title="Make informed decisions with Organizations Insights"
          description="The Organizations Insights dashboard surfaces all activity across your team and shows you trends that enable better team scheduling and decision making."
          actions={
            <>
              <Button variant="default" className="h-9 rounded-md px-4 shadow-sm" onClick={() => {}}>
                <Icon name="sparkles" className="mr-2 h-4 w-4" />
                Upgrade
              </Button>
              <Button variant="outline" className="h-9 rounded-md px-4" onClick={() => {}}>
                Learn more
              </Button>
            </>
          }>
          <div className="bg-card rounded-lg border p-4 shadow-sm md:ml-auto md:max-w-[240px]">
            <p className="text-muted-foreground text-xs">Events Created</p>
            <p className="text-foreground mt-1 text-2xl font-bold">4,875</p>
            <div className="mt-2 flex items-center text-xs font-medium text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              <span>7% from last period</span>
            </div>
          </div>
        </UpsellBanner>
      </section>

      {/* Card Variant */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Card Variant</h2>
        <p className="text-muted-foreground text-sm">Standard card for dashboards or grid layouts.</p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <UpsellCard
            title="Team Plan"
            description="Collaborate with your team effectively."
            image="/tips/teams.jpg"
            actions={
              <>
                <Button variant="default" onClick={() => {}}>
                  Upgrade
                </Button>
                <Button variant="ghost" onClick={() => {}}>
                  Details
                </Button>
              </>
            }></UpsellCard>
        </div>
      </section>

      {/* Inline Alert Variant - Company Email Banner Style */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Inline Alert Variant (Company Email Banner)</h2>
        <p className="text-muted-foreground text-sm">
          Based on the company email banner style. Good for in-context nudges.
        </p>

        <UpsellInlineAlert
          title="It appears you are using a company email"
          description="Explore our organizational plan to unlock team scheduling, unified availability, and more."
          icon={<MailIcon />}
          actions={
            <>
              <Button variant="secondary" size="sm" onClick={() => alert("Dismissed")}>
                Dismiss
              </Button>
              <Button variant="default" size="sm" onClick={() => {}}>
                Upgrade
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </>
          }
        />
      </section>

      {/* Sidebar Variant */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Sidebar / Widget Variant</h2>
        <p className="text-muted-foreground text-sm">Compact version for sidebars or small columns.</p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="w-64">
            <UpsellSidebar
              title="Explore our teams plan!"
              description="No one can whistle a symphony. It takes a whole orchestra to play it."
              image="/tips/teams.jpg"
              actions={
                <Button variant="outline" size="sm" className="w-full">
                  Learn more
                </Button>
              }
              onDismiss={() => {}}
            />
          </div>

          <div className="w-64">
            <UpsellSidebar
              title="Get the App"
              description="Download our desktop app for the best experience."
              actions={
                <Button variant="default" size="sm" className="w-full">
                  Download
                </Button>
              }
            />
          </div>
        </div>
      </section>

      {/* Dialog Variant */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Dialog Variant</h2>
        <p className="text-muted-foreground text-sm">Modal popup for important upsells.</p>

        <Button onClick={() => setIsDialogOpen(true)}>Open Upsell Dialog</Button>

        <UpsellDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title="Unlock Unlimited Event Types"
          description="You've reached the limit of free event types. Upgrade to create more."
          image="/tips/enterprise.jpg"
          icon={<Icon name="zap" className="h-6 w-6 text-yellow-500" />}
          actions={
            <>
              <Button variant="default" onClick={() => setIsDialogOpen(false)}>
                View Plans
              </Button>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                Maybe Later
              </Button>
            </>
          }>
          <p className="text-muted-foreground text-sm">
            Upgrading also removes Cal.com branding and gives you access to team features.
          </p>
        </UpsellDialog>
      </section>
    </div>
  );
}
