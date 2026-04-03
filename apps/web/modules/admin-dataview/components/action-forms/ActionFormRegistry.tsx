"use client";

import type { AdminTable } from "@calcom/features/admin-dataview/AdminTable";
import { EditOrgOnboardingForm } from "./EditOrgOnboardingForm";
import { ReleaseUsernameForm } from "./ReleaseUsernameForm";
import { TransferBillingActionForm } from "./TransferBillingActionForm";
import { TransferOwnershipActionForm } from "./TransferOwnershipActionForm";
import { UpdateBillingModeForm } from "./UpdateBillingModeForm";
import { UpsertDunningActionForm } from "./UpsertDunningActionForm";

export interface ActionFormProps {
  table: AdminTable;
  row: Record<string, unknown>;
  onComplete: () => void;
  onCancel: () => void;
}

export const ACTION_FORM_COMPONENTS: Record<string, React.ComponentType<ActionFormProps>> = {
  "edit-org-onboarding": EditOrgOnboardingForm,
  "release-username": ReleaseUsernameForm,
  "transfer-billing": TransferBillingActionForm,
  "transfer-ownership": TransferOwnershipActionForm,
  "update-billing-mode": UpdateBillingModeForm,
  "upsert-dunning": UpsertDunningActionForm,
};
