"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import type { ActionFormProps } from "./ActionFormRegistry";

export function TransferBillingActionForm({ row, onComplete, onCancel }: ActionFormProps) {
  const { t } = useLocale();
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newSubscriptionId, setNewSubscriptionId] = useState("");

  // Determine billing context from the row
  const billingId = (row.id ?? row.billingId) as string;
  const isOrg = row.isOrganization === true;
  const entityType = isOrg ? "organization" : "team";
  const currentCustomerId = row.customerId as string | undefined;
  const currentSubscriptionId = row.subscriptionId as string | undefined;

  const previewMutation = trpc.viewer.admin.transferBilling.useMutation();
  const executeMutation = trpc.viewer.admin.transferBilling.useMutation({
    onSuccess: () => {
      showToast("Billing transferred successfully", "success");
      onComplete();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const handlePreview = () => {
    previewMutation.mutate({
      billingId,
      entityType,
      newCustomerId: newCustomerId.trim(),
      newSubscriptionId: newSubscriptionId.trim(),
      mode: "preview",
    });
  };

  const handleExecute = () => {
    executeMutation.mutate({
      billingId,
      entityType,
      newCustomerId: newCustomerId.trim(),
      newSubscriptionId: newSubscriptionId.trim(),
      mode: "execute",
    });
  };

  const previewData = previewMutation.data?.mode === "preview" ? previewMutation.data : null;
  const canPreview = newCustomerId.trim().startsWith("cus_") && newSubscriptionId.trim().startsWith("sub_");

  return (
    <div className="space-y-3">
      {currentCustomerId && (
        <div className="text-xs">
          <span className="text-subtle">Current: </span>
          <span className="font-mono">{currentCustomerId}</span>
          {currentSubscriptionId && (
            <>
              <span className="text-subtle"> / </span>
              <span className="font-mono">{currentSubscriptionId}</span>
            </>
          )}
        </div>
      )}

      <TextField
        label="New Customer ID"
        name="newCustomerId"
        placeholder="cus_..."
        value={newCustomerId}
        onChange={(e) => setNewCustomerId(e.target.value)}
      />
      <TextField
        label="New Subscription ID"
        name="newSubscriptionId"
        placeholder="sub_..."
        value={newSubscriptionId}
        onChange={(e) => setNewSubscriptionId(e.target.value)}
      />

      {previewMutation.error && (
        <p className="text-error text-xs">{previewMutation.error.message}</p>
      )}

      {previewData && (
        <div className="divide-subtle divide-y rounded-md border border-subtle text-xs">
          {[
            { label: "Customer ID", from: previewData.current.customerId, to: previewData.new.customerId },
            { label: "Subscription ID", from: previewData.current.subscriptionId, to: previewData.new.subscriptionId },
            { label: "Subscription Item", from: previewData.current.subscriptionItemId ?? "—", to: previewData.new.subscriptionItemId },
          ].map(({ label, from, to }) => (
            <div key={label} className="px-3 py-1.5">
              <span className="text-subtle font-medium">{label}</span>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-error font-mono text-[11px] line-through">{from}</span>
                <span className="text-muted">→</span>
                <span className="text-success font-mono text-[11px]">{to}</span>
              </div>
            </div>
          ))}
          <div className="px-3 py-1.5">
            <span className="text-subtle font-medium">Affected</span>
            <div className="mt-0.5 flex gap-1">
              {previewData.affectedRecords.map((r) => (
                <Badge key={r} variant="gray" size="sm">{r}</Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!previewData ? (
          <>
            <Button
              variant="default"
              size="sm"
              disabled={!canPreview}
              loading={previewMutation.isPending}
              onClick={handlePreview}>
              Preview
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          </>
        ) : (
          <>
            <Button
              variant="default"
              size="sm"
              loading={executeMutation.isPending}
              onClick={handleExecute}>
              Confirm Transfer
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          </>
        )}
      </div>
    </div>
  );
}
