import autoAnimate from "@formkit/auto-animate";
import type { UnitTypeLongPlural } from "dayjs";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { EventTypeSetupProps } from "pages/event-types/[type]";
import { useEffect, useRef, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import type { EventNameObjectType } from "@calcom/core/event";
import { getEventName } from "@calcom/core/event";
import { useOrgBrandingValues } from "@calcom/features/ee/organizations/hooks";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import type { Prisma } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import {
  Alert,
  Badge,
  Button,
  CheckboxField,
  EmptyScreen,
  Label,
  SelectField,
  SettingsToggle,
  showToast,
  Switch,
  TextField,
  Tooltip,
} from "@calcom/ui";
import { Edit2, Check, X, UserPlus, Info } from "@calcom/ui/components/icon";

// Import UpgradeTeamsBadge
import UpgradeTeamsBadge from "@calcom/features/upgrade-badges/UpgradeTeamsBadge";

// Import the new OptionalGuestSettings component
import { OptionalGuestSettings } from "../../OptionalGuestSettings";

import type { FormValues } from "../../../pages/eventtypes/[type]";

// ... rest of the existing component code ...

// Inside the return statement, add OptionalGuestSettings in the appropriate section:
// This should be added after the existing advanced settings

export const EventTypeAdvancedTab = ({ 
  eventType, 
  team 
}: Pick<EventTypeSetupProps, "eventType" | "team">) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  
  // Check if user has team plan
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery();
  const hasTeamPlan = !!team; // Team event types have team plans
  
  // ... existing component logic ...

  return (
    <div className="flex flex-col space-y-4">
      {/* ... existing settings ... */}
      
      {/* Optional Guests Setting - only show for team event types */}
      {team && (
        <OptionalGuestSettings
          teamId={team.id}
          isTeamPlan={hasTeamPlan}
          eventTypeId={eventType.id}
        />
      )}
      
      {/* Show upgrade badge for non-team events */}
      {!team && (
        <div className="border-subtle rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">{t("add_optional_team_members")}</h3>
              <p className="text-subtle text-sm">{t("add_optional_team_members_description")}</p>
            </div>
            <UpgradeTeamsBadge />
          </div>
        </div>
      )}
    </div>
  );
};
