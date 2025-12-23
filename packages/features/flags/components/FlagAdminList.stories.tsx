import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { Switch } from "@calcom/ui/components/form";
import { ListItem, ListItemText, ListItemTitle } from "@calcom/ui/components/list";
import { List } from "@calcom/ui/components/list";

import { AssignFeatureSheet } from "./AssignFeatureSheet";

// Mock flag type
type Flag = RouterOutputs["viewer"]["features"]["list"][number];

// Mock FlagAdminList component without TRPC dependencies
const FlagAdminListStory = ({ flags }: { flags: Flag[] }) => {
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [flagStates, setFlagStates] = useState<Record<string, boolean>>(
    flags.reduce((acc, flag) => ({ ...acc, [flag.slug]: flag.enabled }), {})
  );

  const groupedFlags = flags.reduce((acc, flag) => {
    const type = flag.type || "OTHER";
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(flag);
    return acc;
  }, {} as Record<string, typeof flags>);

  const sortedTypes = Object.keys(groupedFlags).sort();

  const handleAssignClick = (flag: Flag) => {
    setSelectedFlag(flag);
    setSheetOpen(true);
  };

  const handleToggle = (slug: string, checked: boolean) => {
    setFlagStates((prev) => ({ ...prev, [slug]: checked }));
  };

  return (
    <>
      <div className="stack-y-4">
        {sortedTypes.map((type) => (
          <PanelCard key={type} title={type.replace(/_/g, " ")} collapsible defaultCollapsed={false}>
            <List roundContainer noBorderTreatment>
              {groupedFlags[type].map((flag: Flag, index: number) => (
                <ListItem key={flag.slug} rounded={index === 0 || index === groupedFlags[type].length - 1}>
                  <div className="flex flex-1 flex-col">
                    <ListItemTitle component="h3">{flag.slug}</ListItemTitle>
                    <ListItemText component="p">{flag.description}</ListItemText>
                  </div>
                  <div className="flex items-center gap-2 py-2">
                    <Switch
                      defaultChecked={flagStates[flag.slug]}
                      onCheckedChange={(checked) => handleToggle(flag.slug, checked)}
                    />
                    <Button
                      color="secondary"
                      size="sm"
                      variant="icon"
                      onClick={() => handleAssignClick(flag)}
                      StartIcon="users"></Button>
                  </div>
                </ListItem>
              ))}
            </List>
          </PanelCard>
        ))}
      </div>
      {selectedFlag && (
        <AssignFeatureSheet flag={selectedFlag} open={sheetOpen} onOpenChange={setSheetOpen} />
      )}
    </>
  );
};

const meta = {
  component: FlagAdminListStory,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[800px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FlagAdminListStory>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock flag data helper
const createMockFlag = (overrides?: Partial<Flag>): Flag => ({
  slug: "example-flag",
  description: "An example feature flag",
  enabled: false,
  type: "EXPERIMENT",
  lastUpdated: new Date().toISOString(),
  ...overrides,
});

export const Default: Story = {
  args: {
    flags: [
      createMockFlag({
        slug: "new-booking-flow",
        description: "Enable the new streamlined booking flow with improved UX",
        enabled: true,
        type: "EXPERIMENT",
      }),
      createMockFlag({
        slug: "advanced-analytics",
        description: "Advanced analytics dashboard with detailed insights",
        enabled: false,
        type: "EXPERIMENT",
      }),
      createMockFlag({
        slug: "team-collaboration",
        description: "Enhanced team collaboration features",
        enabled: true,
        type: "FEATURE",
      }),
    ],
  },
};

export const SingleType: Story = {
  args: {
    flags: [
      createMockFlag({
        slug: "experiment-a",
        description: "First experimental feature for testing",
        enabled: true,
        type: "EXPERIMENT",
      }),
      createMockFlag({
        slug: "experiment-b",
        description: "Second experimental feature for testing",
        enabled: false,
        type: "EXPERIMENT",
      }),
      createMockFlag({
        slug: "experiment-c",
        description: "Third experimental feature for testing",
        enabled: false,
        type: "EXPERIMENT",
      }),
    ],
  },
};

export const MultipleTypes: Story = {
  args: {
    flags: [
      createMockFlag({
        slug: "ai-scheduling",
        description: "AI-powered scheduling suggestions",
        enabled: true,
        type: "EXPERIMENT",
      }),
      createMockFlag({
        slug: "smart-routing",
        description: "Smart meeting routing based on availability",
        enabled: false,
        type: "EXPERIMENT",
      }),
      createMockFlag({
        slug: "calendar-sync",
        description: "Enhanced calendar synchronization",
        enabled: true,
        type: "FEATURE",
      }),
      createMockFlag({
        slug: "video-integration",
        description: "Native video conferencing integration",
        enabled: true,
        type: "FEATURE",
      }),
      createMockFlag({
        slug: "payment-processing",
        description: "Integrated payment processing",
        enabled: false,
        type: "INTEGRATION",
      }),
      createMockFlag({
        slug: "crm-sync",
        description: "CRM synchronization and data export",
        enabled: false,
        type: "INTEGRATION",
      }),
    ],
  },
};

export const AllEnabled: Story = {
  args: {
    flags: [
      createMockFlag({
        slug: "feature-one",
        description: "First enabled feature",
        enabled: true,
        type: "FEATURE",
      }),
      createMockFlag({
        slug: "feature-two",
        description: "Second enabled feature",
        enabled: true,
        type: "FEATURE",
      }),
      createMockFlag({
        slug: "feature-three",
        description: "Third enabled feature",
        enabled: true,
        type: "FEATURE",
      }),
    ],
  },
};

export const AllDisabled: Story = {
  args: {
    flags: [
      createMockFlag({
        slug: "disabled-feature-one",
        description: "First disabled feature",
        enabled: false,
        type: "EXPERIMENT",
      }),
      createMockFlag({
        slug: "disabled-feature-two",
        description: "Second disabled feature",
        enabled: false,
        type: "EXPERIMENT",
      }),
      createMockFlag({
        slug: "disabled-feature-three",
        description: "Third disabled feature",
        enabled: false,
        type: "EXPERIMENT",
      }),
    ],
  },
};

export const LongDescriptions: Story = {
  args: {
    flags: [
      createMockFlag({
        slug: "comprehensive-analytics",
        description:
          "A comprehensive analytics suite that provides deep insights into booking patterns, user behavior, conversion rates, and team performance metrics. Includes customizable dashboards, exportable reports, and real-time data visualization.",
        enabled: true,
        type: "FEATURE",
      }),
      createMockFlag({
        slug: "enterprise-sso",
        description:
          "Enterprise-grade Single Sign-On (SSO) integration with support for SAML 2.0, OAuth 2.0, and OpenID Connect. Enables seamless authentication across your organization's identity provider with advanced security features and audit logging.",
        enabled: false,
        type: "FEATURE",
      }),
    ],
  },
};

export const ManyFlags: Story = {
  args: {
    flags: [
      createMockFlag({
        slug: "experiment-alpha",
        description: "Alpha experiment for new UI patterns",
        enabled: true,
        type: "EXPERIMENT",
      }),
      createMockFlag({
        slug: "experiment-beta",
        description: "Beta experiment for performance optimization",
        enabled: false,
        type: "EXPERIMENT",
      }),
      createMockFlag({
        slug: "experiment-gamma",
        description: "Gamma experiment for user onboarding",
        enabled: true,
        type: "EXPERIMENT",
      }),
      createMockFlag({
        slug: "feature-notifications",
        description: "Enhanced notification system",
        enabled: true,
        type: "FEATURE",
      }),
      createMockFlag({
        slug: "feature-mobile-app",
        description: "Native mobile application support",
        enabled: false,
        type: "FEATURE",
      }),
      createMockFlag({
        slug: "feature-webhooks",
        description: "Advanced webhook configuration",
        enabled: true,
        type: "FEATURE",
      }),
      createMockFlag({
        slug: "integration-slack",
        description: "Slack workspace integration",
        enabled: true,
        type: "INTEGRATION",
      }),
      createMockFlag({
        slug: "integration-teams",
        description: "Microsoft Teams integration",
        enabled: false,
        type: "INTEGRATION",
      }),
      createMockFlag({
        slug: "integration-salesforce",
        description: "Salesforce CRM integration",
        enabled: false,
        type: "INTEGRATION",
      }),
      createMockFlag({
        slug: "beta-ai-assistant",
        description: "AI-powered scheduling assistant",
        enabled: true,
        type: "BETA",
      }),
      createMockFlag({
        slug: "beta-voice-booking",
        description: "Voice-activated booking",
        enabled: false,
        type: "BETA",
      }),
    ],
  },
};

export const EmptyState: Story = {
  args: {
    flags: [],
  },
  render: () => (
    <div className="text-subtle p-8 text-center">
      <p>No feature flags configured</p>
    </div>
  ),
};

export const MixedStates: Story = {
  args: {
    flags: [
      createMockFlag({
        slug: "booking-buffer-time",
        description: "Add buffer time between bookings",
        enabled: true,
        type: "FEATURE",
      }),
      createMockFlag({
        slug: "custom-branding",
        description: "Custom branding and white-labeling options",
        enabled: false,
        type: "FEATURE",
      }),
      createMockFlag({
        slug: "round-robin-v2",
        description: "Improved round-robin scheduling algorithm",
        enabled: true,
        type: "EXPERIMENT",
      }),
      createMockFlag({
        slug: "advanced-routing",
        description: "Advanced meeting routing rules",
        enabled: false,
        type: "EXPERIMENT",
      }),
      createMockFlag({
        slug: "zapier-integration",
        description: "Zapier automation integration",
        enabled: true,
        type: "INTEGRATION",
      }),
    ],
  },
};
