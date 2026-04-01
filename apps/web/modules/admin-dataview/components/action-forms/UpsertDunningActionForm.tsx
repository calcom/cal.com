"use client";

import { useState } from "react";

import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { Button } from "@coss/ui/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";

import type { ActionFormProps } from "./ActionFormRegistry";

type DunningStatusValue = "CURRENT" | "WARNING" | "SOFT_BLOCKED" | "HARD_BLOCKED" | "CANCELLED";

type DunningStatusOption = { label: DunningStatusValue; value: DunningStatusValue };

const DUNNING_STATUSES: DunningStatusOption[] = [
  { label: "CURRENT", value: "CURRENT" },
  { label: "WARNING", value: "WARNING" },
  { label: "SOFT_BLOCKED", value: "SOFT_BLOCKED" },
  { label: "HARD_BLOCKED", value: "HARD_BLOCKED" },
  { label: "CANCELLED", value: "CANCELLED" },
];

function isValidInvoiceUrl(val: string): boolean {
  if (val === "") return true;
  return val.startsWith("https://") || val.startsWith("http://") || val.startsWith("mailto:");
}

export function UpsertDunningActionForm({ row, onComplete, onCancel }: ActionFormProps) {
  const currentStatus = (row.status as string) ?? "CURRENT";
  const currentInvoiceUrl = (row.invoiceUrl as string) ?? "";

  const billingId = (row.teamBillingId ?? row.organizationBillingId) as string;
  const isOrg = !!row.organizationBillingId;
  const entityType = isOrg ? "organization" : "team";

  const [status, setStatus] = useState<DunningStatusValue>(currentStatus as DunningStatusValue);
  const [invoiceUrl, setInvoiceUrl] = useState(currentInvoiceUrl);
  const [urlError, setUrlError] = useState("");

  const mutation = trpc.viewer.admin.upsertDunning.useMutation({
    onSuccess: (data) => {
      showToast(data.message, "success");
      onComplete();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const handleSubmit = () => {
    if (!isValidInvoiceUrl(invoiceUrl)) {
      setUrlError("Must be a valid URL (https://) or mailto: link");
      return;
    }
    setUrlError("");
    mutation.mutate({
      billingId,
      entityType,
      status,
      invoiceUrl: invoiceUrl || null,
    });
  };

  const selectedItem = DUNNING_STATUSES.find((s) => s.value === status) ?? DUNNING_STATUSES[0];

  return (
    <div className="space-y-4">
      <div className="text-muted-foreground text-xs">
        {entityType === "organization" ? "Organization" : "Team"} billing:{" "}
        <span className="font-mono">{billingId}</span>
      </div>

      <Field name="status">
        <FieldLabel>Dunning Status</FieldLabel>
        <Select
          items={DUNNING_STATUSES}
          defaultValue={selectedItem}
          onValueChange={(val) => {
            if (val) setStatus(val.value as DunningStatusValue);
          }}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectPopup>
            {DUNNING_STATUSES.map((item) => (
              <SelectItem key={item.value} value={item}>
                {item.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        {currentStatus !== "CURRENT" && (
          <FieldDescription>
            Current: <span className="font-medium">{currentStatus}</span>
          </FieldDescription>
        )}
      </Field>

      <Field name="invoiceUrl">
        <FieldLabel>Invoice URL</FieldLabel>
        <Input
          type="url"
          placeholder="https://... or mailto:billing@example.com"
          value={invoiceUrl}
          onChange={(e) => {
            setInvoiceUrl(e.target.value);
            if (urlError) setUrlError("");
          }}
        />
        <FieldDescription>Accepts https:// URLs or mailto: links. Leave empty to clear.</FieldDescription>
        {urlError && <FieldError>{urlError}</FieldError>}
      </Field>

      {mutation.error && <p className="text-destructive text-xs">{mutation.error.message}</p>}

      <div className="flex gap-2">
        <Button type="button" size="sm" loading={mutation.isPending} onClick={handleSubmit}>
          {row.id ? "Update Dunning" : "Create Dunning"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
