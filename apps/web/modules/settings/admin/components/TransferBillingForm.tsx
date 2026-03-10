"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

function TransferPreview({
  previewData,
  t,
}: {
  previewData: {
    current: { customerId: string; subscriptionId: string; subscriptionItemId: string | null };
    new: { customerId: string; subscriptionId: string; subscriptionItemId: string };
    affectedRecords: string[];
  };
  t: (key: string) => string;
}) {
  return (
    <div className="bg-muted mt-3 space-y-3 rounded-md p-3">
      {[
        { label: t("customer_id"), current: previewData.current.customerId, next: previewData.new.customerId },
        {
          label: t("subscription_id"),
          current: previewData.current.subscriptionId,
          next: previewData.new.subscriptionId,
        },
        {
          label: t("subscription_item_id"),
          current: previewData.current.subscriptionItemId ?? t("not_set"),
          next: previewData.new.subscriptionItemId,
        },
      ].map(({ label, current, next }) => (
        <div key={label}>
          <span className="text-subtle text-xs font-medium">{label}</span>
          <div className="mt-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-error/10 text-error inline-block rounded px-1 py-0.5 font-mono text-[11px] line-through">
                {current}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-success/10 text-success inline-block rounded px-1 py-0.5 font-mono text-[11px]">
                {next}
              </span>
            </div>
          </div>
        </div>
      ))}
      <div className="border-subtle border-t pt-2">
        <span className="text-subtle text-xs font-medium">{t("affected_records")}</span>
        <div className="mt-1 flex gap-1.5">
          {previewData.affectedRecords.map((record) => (
            <span key={record} className="bg-emphasis/10 text-emphasis rounded px-1.5 py-0.5 text-[11px]">
              {record}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TransferBillingForm({
  billingId,
  entityType,
  onComplete,
}: {
  billingId: string;
  entityType: "team" | "organization";
  onComplete: () => void;
}) {
  const { t } = useLocale();
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newSubscriptionId, setNewSubscriptionId] = useState("");
  const [showForm, setShowForm] = useState(false);

  const previewMutation = trpc.viewer.admin.transferBilling.useMutation();
  const executeMutation = trpc.viewer.admin.transferBilling.useMutation({
    onSuccess: () => {
      showToast(t("transfer_success"), "success");
      onComplete();
      setShowForm(false);
      setNewCustomerId("");
      setNewSubscriptionId("");
      previewMutation.reset();
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

  const handleCancel = () => {
    setShowForm(false);
    setNewCustomerId("");
    setNewSubscriptionId("");
    previewMutation.reset();
  };

  const previewData = previewMutation.data?.mode === "preview" ? previewMutation.data : null;
  const canPreview = newCustomerId.trim().startsWith("cus_") && newSubscriptionId.trim().startsWith("sub_");

  if (!showForm) {
    return (
      <Button color="secondary" size="sm" onClick={() => setShowForm(true)}>
        {t("transfer_billing")}
      </Button>
    );
  }

  return (
    <div className="border-subtle mt-3 rounded-lg border p-3">
      <h4 className="text-emphasis mb-2 text-xs font-semibold">{t("transfer_billing")}</h4>
      <p className="text-subtle mb-3 text-xs">{t("transfer_billing_description")}</p>

      <div className="space-y-2">
        <TextField
          label={t("new_customer_id")}
          name="newCustomerId"
          placeholder="cus_..."
          value={newCustomerId}
          onChange={(e) => setNewCustomerId(e.target.value)}
        />
        <TextField
          label={t("new_subscription_id")}
          name="newSubscriptionId"
          placeholder="sub_..."
          value={newSubscriptionId}
          onChange={(e) => setNewSubscriptionId(e.target.value)}
        />
      </div>

      {previewMutation.error && <p className="text-error mt-2 text-xs">{previewMutation.error.message}</p>}

      {previewData && <TransferPreview previewData={previewData} t={t} />}

      <div className="mt-3 flex gap-2">
        {!previewData ? (
          <>
            <Button
              color="secondary"
              size="sm"
              disabled={!canPreview}
              loading={previewMutation.isPending}
              onClick={handlePreview}>
              {t("preview_changes")}
            </Button>
            <Button color="minimal" size="sm" onClick={handleCancel}>
              {t("cancel")}
            </Button>
          </>
        ) : (
          <>
            <Button color="primary" size="sm" loading={executeMutation.isPending} onClick={handleExecute}>
              {t("confirm_transfer")}
            </Button>
            <Button color="minimal" size="sm" onClick={handleCancel}>
              {t("cancel")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
