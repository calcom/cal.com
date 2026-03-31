"use client";

import { useState } from "react";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@coss/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@coss/ui/components/select";
import { showToast } from "@calcom/ui/components/toast";

import type { ActionFormProps } from "./ActionFormRegistry";

const BILLING_MODE_OPTIONS = [
  { value: "SEATS", label: "Seats" },
  { value: "ACTIVE_USERS", label: "Active Users" },
];

export function UpdateBillingModeForm({ table, row, onComplete, onCancel }: ActionFormProps) {
  const currentMode = (row.billingMode as string) ?? "SEATS";
  const currentMinSeats = (row.minSeats as number | null) ?? null;

  const currentPricePerSeat = (row.pricePerSeat as number | null) ?? null;

  const [billingMode, setBillingMode] = useState(currentMode);
  const [minSeats, setMinSeats] = useState<string>(currentMinSeats != null ? String(currentMinSeats) : "");
  const [pricePerSeat, setPricePerSeat] = useState<string>(
    currentPricePerSeat != null ? String(currentPricePerSeat) : ""
  );

  const entityType = table.def.slug === "org-billing" ? "organization" : "team";

  const mutation = trpc.viewer.admin.updateBillingMode.useMutation({
    onSuccess: () => {
      showToast("Billing mode updated", "success");
      onComplete();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const handleSubmit = () => {
    mutation.mutate({
      billingId: row.id as string,
      entityType,
      billingMode: billingMode as "SEATS" | "ACTIVE_USERS",
      minSeats: billingMode === "ACTIVE_USERS" && minSeats !== "" ? parseInt(minSeats, 10) : null,
      pricePerSeat:
        billingMode === "ACTIVE_USERS" && pricePerSeat !== "" ? parseInt(pricePerSeat, 10) : null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-subtle text-xs">
        Update billing mode for billing record <span className="font-mono">{row.id as string}</span>
        {row.teamId ? ` (Team ID: ${row.teamId})` : ""}
      </div>

      <div className="space-y-1.5">
        <Label>Billing Mode</Label>
        <Select
          items={BILLING_MODE_OPTIONS}
          defaultValue={BILLING_MODE_OPTIONS.find((o) => o.value === billingMode)}
          onValueChange={(val) => {
            if (val) setBillingMode(val.value);
          }}>
          <SelectTrigger>
            <SelectValue placeholder="Select billing mode" />
          </SelectTrigger>
          <SelectPopup>
            {BILLING_MODE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>

      {billingMode === "ACTIVE_USERS" && (
        <>
          <Field>
            <FieldLabel>Min Seats</FieldLabel>
            <Input
              name="minSeats"
              type="number"
              placeholder="e.g. 5"
              value={minSeats}
              onChange={(e) => setMinSeats(e.target.value)}
            />
            <FieldDescription>Minimum number of seats to bill for when using active users mode</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Price Per Seat (cents)</FieldLabel>
            <Input
              name="pricePerSeat"
              type="number"
              placeholder="e.g. 1200"
              value={pricePerSeat}
              onChange={(e) => setPricePerSeat(e.target.value)}
            />
            <FieldDescription>Price per active user seat in cents (e.g. 1200 = $12.00)</FieldDescription>
          </Field>
        </>
      )}

      {mutation.error && <p className="text-error text-xs">{mutation.error.message}</p>}

      <div className="flex gap-2">
        <Button variant="default" size="sm" loading={mutation.isPending} onClick={handleSubmit}>
          Update Billing Mode
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
