"use client";

import type { AdminTable } from "@calcom/features/admin-dataview/AdminTable";

import { TransferBillingActionForm } from "./TransferBillingActionForm";
import { TransferOwnershipActionForm } from "./TransferOwnershipActionForm";

export interface ActionFormProps {
  table: AdminTable;
  row: Record<string, unknown>;
  onComplete: () => void;
  onCancel: () => void;
}

export const ACTION_FORM_COMPONENTS: Record<string, React.ComponentType<ActionFormProps>> = {
  "transfer-billing": TransferBillingActionForm,
  "transfer-ownership": TransferOwnershipActionForm,
};
